// Tweet Scraper
// Scrapes tweets, replies, retweets, and likes from X profiles

import { Page } from 'playwright'
import { getSessionManager } from './session-manager'
import { humanBehavior } from '@/lib/services/human-behavior'
import type { ScrapedTweet, ProfileData } from './x-automation'

export interface ScrapeOptions {
  maxTweets?: number
  includeReplies?: boolean
  includeRetweets?: boolean
  since?: Date
  until?: Date
}

export interface TimelineTweet extends ScrapedTweet {
  isLiked: boolean
  isRetweeted: boolean
  isBookmarked: boolean
  conversationId?: string
  inReplyToUsername?: string
  media?: {
    type: 'image' | 'video' | 'gif'
    url: string
    thumbnail?: string
  }[]
}

export interface UserLike {
  tweetId: string
  tweet: ScrapedTweet
  likedAt?: Date
}

export interface TrendingTopic {
  name: string
  category?: string
  tweetCount?: number
  url: string
}

export class TweetScraper {
  private accountId: string

  constructor(accountId: string) {
    this.accountId = accountId
  }

  /**
   * Get page instance
   */
  private async getPage(): Promise<Page> {
    const sessionManager = getSessionManager()
    const { page } = await sessionManager.getSession(this.accountId)
    return page
  }

  /**
   * Human-like delay
   */
  private async humanDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = min + Math.random() * (max - min)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Scroll page with human-like behavior
   */
  private async humanScroll(page: Page, scrollAmount: number = 500): Promise<void> {
    // Variable scroll speed
    const steps = 3 + Math.floor(Math.random() * 3)
    const stepAmount = scrollAmount / steps

    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, stepAmount + (Math.random() * 50 - 25))
      await this.humanDelay(100, 300)
    }

    // Occasional pause to "read"
    if (Math.random() < 0.3) {
      await this.humanDelay(1000, 3000)
    }
  }

  /**
   * Extract tweet data from a tweet element
   */
  private async extractTweetData(page: Page, tweetElement: unknown): Promise<TimelineTweet | null> {
    try {
      const tweetData = await page.evaluate((el) => {
        const element = el as Element

        // Get tweet link for ID
        const tweetLink = element.querySelector('a[href*="/status/"]')
        const href = tweetLink?.getAttribute('href') || ''
        const statusMatch = href.match(/\/status\/(\d+)/)
        const id = statusMatch ? statusMatch[1] : ''

        if (!id) return null

        // Get content
        const contentEl = element.querySelector('[data-testid="tweetText"]')
        const content = contentEl?.textContent || ''

        // Get author info
        const authorEl = element.querySelector('[data-testid="User-Name"]')
        const authorLinks = authorEl?.querySelectorAll('a') || []
        let authorUsername = ''
        let authorDisplayName = ''

        for (const link of authorLinks) {
          const linkHref = link.getAttribute('href') || ''
          if (linkHref.startsWith('/') && !linkHref.includes('/status/')) {
            authorUsername = linkHref.slice(1)
            authorDisplayName = link.textContent || ''
            break
          }
        }

        // Get timestamp
        const timeEl = element.querySelector('time')
        const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString()

        // Get engagement stats
        const getStatValue = (testId: string): number => {
          const statEl = element.querySelector(`[data-testid="${testId}"]`)
          const text = statEl?.textContent || '0'
          const num = parseInt(text.replace(/[^0-9]/g, '')) || 0
          return num
        }

        const likeCount = getStatValue('like')
        const retweetCount = getStatValue('retweet')
        const replyCount = getStatValue('reply')

        // Check for media
        const hasMedia = element.querySelector('[data-testid="tweetPhoto"], video, [data-testid="videoPlayer"]') !== null

        // Check if it's a retweet
        const isRetweet = element.querySelector('[data-testid="socialContext"]')?.textContent?.includes('reposted') || false

        // Check if it's a reply
        const isReply = element.querySelector('[data-testid="socialContext"]')?.textContent?.includes('Replying') || false

        // Get quoted tweet ID if exists
        const quotedEl = element.querySelector('[data-testid="tweet"] [data-testid="tweet"]')
        const quotedLink = quotedEl?.querySelector('a[href*="/status/"]')
        const quotedHref = quotedLink?.getAttribute('href') || ''
        const quotedMatch = quotedHref.match(/\/status\/(\d+)/)
        const quotedTweetId = quotedMatch ? quotedMatch[1] : undefined

        // Check interaction states
        const isLiked = element.querySelector('[data-testid="unlike"]') !== null
        const isRetweeted = element.querySelector('[data-testid="unretweet"]') !== null
        const isBookmarked = element.querySelector('[data-testid="removeBookmark"]') !== null

        // Get reply context
        const replyContext = element.querySelector('[data-testid="socialContext"]')
        const replyMatch = replyContext?.textContent?.match(/Replying to @(\w+)/)
        const inReplyToUsername = replyMatch ? replyMatch[1] : undefined

        // Get media
        const mediaElements: { type: 'image' | 'video' | 'gif'; url: string; thumbnail?: string }[] = []

        // Images
        element.querySelectorAll('[data-testid="tweetPhoto"] img').forEach((img) => {
          const src = img.getAttribute('src')
          if (src && !src.includes('profile_images')) {
            mediaElements.push({ type: 'image', url: src })
          }
        })

        // Videos
        element.querySelectorAll('video').forEach((video) => {
          const poster = video.getAttribute('poster')
          const src = video.querySelector('source')?.getAttribute('src')
          mediaElements.push({
            type: 'video',
            url: src || '',
            thumbnail: poster || undefined,
          })
        })

        return {
          id,
          content,
          authorUsername,
          authorDisplayName,
          timestamp: new Date(timestamp),
          likeCount,
          retweetCount,
          replyCount,
          hasMedia,
          isRetweet,
          isReply,
          quotedTweetId,
          isLiked,
          isRetweeted,
          isBookmarked,
          inReplyToUsername,
          media: mediaElements.length > 0 ? mediaElements : undefined,
        }
      }, tweetElement)

      if (!tweetData) return null

      return {
        ...tweetData,
        timestamp: new Date(tweetData.timestamp),
        viewCount: undefined,
      } as TimelineTweet
    } catch (error) {
      console.error('Error extracting tweet data:', error)
      return null
    }
  }

  /**
   * Scrape user's tweets
   */
  async scrapeUserTweets(username: string, options: ScrapeOptions = {}): Promise<TimelineTweet[]> {
    const page = await this.getPage()
    const {
      maxTweets = 50,
      includeReplies = false,
      includeRetweets = true,
      since,
      until,
    } = options

    const tweets: TimelineTweet[] = []
    const seenIds = new Set<string>()

    try {
      // Navigate to profile
      const url = includeReplies
        ? `https://x.com/${username}/with_replies`
        : `https://x.com/${username}`

      await page.goto(url, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Scroll and collect tweets
      let noNewTweetsCount = 0
      const maxNoNewTweets = 3

      while (tweets.length < maxTweets && noNewTweetsCount < maxNoNewTweets) {
        // Get all tweet elements
        const tweetElements = await page.$$('[data-testid="tweet"]')

        let newTweetsFound = false

        for (const element of tweetElements) {
          if (tweets.length >= maxTweets) break

          const tweet = await this.extractTweetData(page, element)

          if (tweet && !seenIds.has(tweet.id)) {
            // Filter by date if specified
            if (since && tweet.timestamp < since) continue
            if (until && tweet.timestamp > until) continue

            // Filter retweets if needed
            if (!includeRetweets && tweet.isRetweet) continue

            seenIds.add(tweet.id)
            tweets.push(tweet)
            newTweetsFound = true
          }
        }

        if (!newTweetsFound) {
          noNewTweetsCount++
        } else {
          noNewTweetsCount = 0
        }

        // Scroll down
        await this.humanScroll(page, 800)
        await this.humanDelay(1000, 2000)

        // Check if we've hit the date boundary
        if (tweets.length > 0 && since) {
          const oldestTweet = tweets[tweets.length - 1]
          if (oldestTweet.timestamp < since) break
        }
      }

      // Record action
      humanBehavior.recordAction('browse')

      return tweets
    } catch (error) {
      console.error('Error scraping user tweets:', error)
      return tweets
    }
  }

  /**
   * Scrape user's likes
   */
  async scrapeUserLikes(username: string, maxLikes: number = 50): Promise<UserLike[]> {
    const page = await this.getPage()
    const likes: UserLike[] = []
    const seenIds = new Set<string>()

    try {
      // Navigate to likes page
      await page.goto(`https://x.com/${username}/likes`, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Check if likes are private
      const privateMessage = await page.$('text=These are private')
      if (privateMessage) {
        console.log('User likes are private')
        return likes
      }

      // Scroll and collect likes
      let noNewLikesCount = 0
      const maxNoNewLikes = 3

      while (likes.length < maxLikes && noNewLikesCount < maxNoNewLikes) {
        const tweetElements = await page.$$('[data-testid="tweet"]')

        let newLikesFound = false

        for (const element of tweetElements) {
          if (likes.length >= maxLikes) break

          const tweet = await this.extractTweetData(page, element)

          if (tweet && !seenIds.has(tweet.id)) {
            seenIds.add(tweet.id)
            likes.push({
              tweetId: tweet.id,
              tweet: {
                id: tweet.id,
                content: tweet.content,
                authorUsername: tweet.authorUsername,
                authorDisplayName: tweet.authorDisplayName,
                timestamp: tweet.timestamp,
                likeCount: tweet.likeCount,
                retweetCount: tweet.retweetCount,
                replyCount: tweet.replyCount,
                hasMedia: tweet.hasMedia,
                isRetweet: tweet.isRetweet,
                isReply: tweet.isReply,
                quotedTweetId: tweet.quotedTweetId,
              },
            })
            newLikesFound = true
          }
        }

        if (!newLikesFound) {
          noNewLikesCount++
        } else {
          noNewLikesCount = 0
        }

        await this.humanScroll(page, 800)
        await this.humanDelay(1000, 2000)
      }

      humanBehavior.recordAction('browse')

      return likes
    } catch (error) {
      console.error('Error scraping user likes:', error)
      return likes
    }
  }

  /**
   * Scrape tweet replies
   */
  async scrapeTweetReplies(tweetUrl: string, maxReplies: number = 30): Promise<TimelineTweet[]> {
    const page = await this.getPage()
    const replies: TimelineTweet[] = []
    const seenIds = new Set<string>()

    try {
      // Navigate to tweet
      await page.goto(tweetUrl, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Get the original tweet ID to exclude it
      const originalMatch = tweetUrl.match(/\/status\/(\d+)/)
      const originalId = originalMatch ? originalMatch[1] : ''

      // Scroll and collect replies
      let noNewRepliesCount = 0
      const maxNoNewReplies = 3

      while (replies.length < maxReplies && noNewRepliesCount < maxNoNewReplies) {
        const tweetElements = await page.$$('[data-testid="tweet"]')

        let newRepliesFound = false

        for (const element of tweetElements) {
          if (replies.length >= maxReplies) break

          const tweet = await this.extractTweetData(page, element)

          if (tweet && !seenIds.has(tweet.id) && tweet.id !== originalId) {
            seenIds.add(tweet.id)
            replies.push(tweet)
            newRepliesFound = true
          }
        }

        if (!newRepliesFound) {
          noNewRepliesCount++
        } else {
          noNewRepliesCount = 0
        }

        await this.humanScroll(page, 600)
        await this.humanDelay(1000, 2000)
      }

      humanBehavior.recordAction('browse')

      return replies
    } catch (error) {
      console.error('Error scraping tweet replies:', error)
      return replies
    }
  }

  /**
   * Scrape home timeline
   */
  async scrapeTimeline(maxTweets: number = 50): Promise<TimelineTweet[]> {
    const page = await this.getPage()
    const tweets: TimelineTweet[] = []
    const seenIds = new Set<string>()

    try {
      // Navigate to home
      await page.goto('https://x.com/home', { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Scroll and collect tweets
      let noNewTweetsCount = 0
      const maxNoNewTweets = 3

      while (tweets.length < maxTweets && noNewTweetsCount < maxNoNewTweets) {
        const tweetElements = await page.$$('[data-testid="tweet"]')

        let newTweetsFound = false

        for (const element of tweetElements) {
          if (tweets.length >= maxTweets) break

          const tweet = await this.extractTweetData(page, element)

          if (tweet && !seenIds.has(tweet.id)) {
            seenIds.add(tweet.id)
            tweets.push(tweet)
            newTweetsFound = true
          }
        }

        if (!newTweetsFound) {
          noNewTweetsCount++
        } else {
          noNewTweetsCount = 0
        }

        await this.humanScroll(page, 800)
        await this.humanDelay(1000, 2000)
      }

      humanBehavior.recordAction('browse')

      return tweets
    } catch (error) {
      console.error('Error scraping timeline:', error)
      return tweets
    }
  }

  /**
   * Scrape trending topics
   */
  async scrapeTrending(): Promise<TrendingTopic[]> {
    const page = await this.getPage()
    const trends: TrendingTopic[] = []

    try {
      // Navigate to explore/trending
      await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Extract trending topics
      const trendData = await page.evaluate(() => {
        const items: { name: string; category?: string; tweetCount?: number; url: string }[] = []

        // Get trend cells
        const trendCells = document.querySelectorAll('[data-testid="trend"]')

        trendCells.forEach((cell) => {
          const link = cell.querySelector('a')
          const url = link?.getAttribute('href') || ''

          // Get trend name (usually the main text)
          const spans = cell.querySelectorAll('span')
          let name = ''
          let category: string | undefined
          let tweetCount: number | undefined

          spans.forEach((span) => {
            const text = span.textContent || ''

            // Trend name is usually bold/larger
            if (text.startsWith('#') || (text.length > 2 && !text.includes('Trending') && !text.includes('posts'))) {
              if (!name) name = text
            }

            // Category
            if (text.includes('Trending in') || text.includes('·')) {
              category = text.replace('Trending in ', '').replace('· ', '')
            }

            // Tweet count
            const countMatch = text.match(/(\d+\.?\d*[KMB]?)\s*(posts|Tweets)/i)
            if (countMatch) {
              const numStr = countMatch[1]
              let num = parseFloat(numStr)
              if (numStr.includes('K')) num *= 1000
              else if (numStr.includes('M')) num *= 1000000
              else if (numStr.includes('B')) num *= 1000000000
              tweetCount = Math.floor(num)
            }
          })

          if (name && url) {
            items.push({ name, category, tweetCount, url: `https://x.com${url}` })
          }
        })

        return items
      })

      trends.push(...trendData)

      humanBehavior.recordAction('browse')

      return trends
    } catch (error) {
      console.error('Error scraping trending:', error)
      return trends
    }
  }

  /**
   * Search tweets
   */
  async searchTweets(query: string, options: ScrapeOptions = {}): Promise<TimelineTweet[]> {
    const page = await this.getPage()
    const { maxTweets = 50, since, until } = options
    const tweets: TimelineTweet[] = []
    const seenIds = new Set<string>()

    try {
      // Build search URL with date filters
      let searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`

      if (since) {
        searchUrl += `%20since%3A${since.toISOString().split('T')[0]}`
      }
      if (until) {
        searchUrl += `%20until%3A${until.toISOString().split('T')[0]}`
      }

      await page.goto(searchUrl, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      // Scroll and collect tweets
      let noNewTweetsCount = 0
      const maxNoNewTweets = 3

      while (tweets.length < maxTweets && noNewTweetsCount < maxNoNewTweets) {
        const tweetElements = await page.$$('[data-testid="tweet"]')

        let newTweetsFound = false

        for (const element of tweetElements) {
          if (tweets.length >= maxTweets) break

          const tweet = await this.extractTweetData(page, element)

          if (tweet && !seenIds.has(tweet.id)) {
            seenIds.add(tweet.id)
            tweets.push(tweet)
            newTweetsFound = true
          }
        }

        if (!newTweetsFound) {
          noNewTweetsCount++
        } else {
          noNewTweetsCount = 0
        }

        await this.humanScroll(page, 800)
        await this.humanDelay(1000, 2000)
      }

      humanBehavior.recordAction('browse')

      return tweets
    } catch (error) {
      console.error('Error searching tweets:', error)
      return tweets
    }
  }

  /**
   * Get followers of a user
   */
  async scrapeFollowers(username: string, maxFollowers: number = 50): Promise<ProfileData[]> {
    const page = await this.getPage()
    const followers: ProfileData[] = []
    const seenUsernames = new Set<string>()

    try {
      await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      let noNewCount = 0
      const maxNoNew = 3

      while (followers.length < maxFollowers && noNewCount < maxNoNew) {
        const userCells = await page.$$('[data-testid="UserCell"]')

        let newFound = false

        for (const cell of userCells) {
          if (followers.length >= maxFollowers) break

          const userData = await page.evaluate((el) => {
            const element = el as Element

            const link = element.querySelector('a[href^="/"]')
            const username = link?.getAttribute('href')?.slice(1) || ''

            if (!username) return null

            const nameEl = element.querySelector('[dir="ltr"] span')
            const displayName = nameEl?.textContent || username

            const bioEl = element.querySelector('[data-testid="UserDescription"]')
            const bio = bioEl?.textContent || ''

            const isVerified = element.querySelector('[data-testid="icon-verified"]') !== null

            return {
              username,
              displayName,
              bio,
              isVerified,
            }
          }, cell)

          if (userData && !seenUsernames.has(userData.username)) {
            seenUsernames.add(userData.username)
            followers.push({
              username: userData.username,
              displayName: userData.displayName,
              bio: userData.bio,
              joinDate: '',
              followersCount: 0,
              followingCount: 0,
              tweetsCount: 0,
              isVerified: userData.isVerified,
            })
            newFound = true
          }
        }

        if (!newFound) {
          noNewCount++
        } else {
          noNewCount = 0
        }

        await this.humanScroll(page, 600)
        await this.humanDelay(1000, 2000)
      }

      humanBehavior.recordAction('browse')

      return followers
    } catch (error) {
      console.error('Error scraping followers:', error)
      return followers
    }
  }

  /**
   * Get following of a user
   */
  async scrapeFollowing(username: string, maxFollowing: number = 50): Promise<ProfileData[]> {
    const page = await this.getPage()
    const following: ProfileData[] = []
    const seenUsernames = new Set<string>()

    try {
      await page.goto(`https://x.com/${username}/following`, { waitUntil: 'networkidle' })
      await this.humanDelay(1500, 3000)

      let noNewCount = 0
      const maxNoNew = 3

      while (following.length < maxFollowing && noNewCount < maxNoNew) {
        const userCells = await page.$$('[data-testid="UserCell"]')

        let newFound = false

        for (const cell of userCells) {
          if (following.length >= maxFollowing) break

          const userData = await page.evaluate((el) => {
            const element = el as Element

            const link = element.querySelector('a[href^="/"]')
            const username = link?.getAttribute('href')?.slice(1) || ''

            if (!username) return null

            const nameEl = element.querySelector('[dir="ltr"] span')
            const displayName = nameEl?.textContent || username

            const bioEl = element.querySelector('[data-testid="UserDescription"]')
            const bio = bioEl?.textContent || ''

            const isVerified = element.querySelector('[data-testid="icon-verified"]') !== null

            return {
              username,
              displayName,
              bio,
              isVerified,
            }
          }, cell)

          if (userData && !seenUsernames.has(userData.username)) {
            seenUsernames.add(userData.username)
            following.push({
              username: userData.username,
              displayName: userData.displayName,
              bio: userData.bio,
              joinDate: '',
              followersCount: 0,
              followingCount: 0,
              tweetsCount: 0,
              isVerified: userData.isVerified,
            })
            newFound = true
          }
        }

        if (!newFound) {
          noNewCount++
        } else {
          noNewCount = 0
        }

        await this.humanScroll(page, 600)
        await this.humanDelay(1000, 2000)
      }

      humanBehavior.recordAction('browse')

      return following
    } catch (error) {
      console.error('Error scraping following:', error)
      return following
    }
  }
}

export function createTweetScraper(accountId: string): TweetScraper {
  return new TweetScraper(accountId)
}
