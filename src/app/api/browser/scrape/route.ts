// Browser Scrape API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createTweetScraper, createXAutomation } from '@/lib/browser'

const ScrapeUserTweetsSchema = z.object({
  accountId: z.string().min(1),
  username: z.string().min(1),
  maxTweets: z.number().min(1).max(200).default(50),
  includeReplies: z.boolean().default(false),
  includeRetweets: z.boolean().default(true),
  since: z.string().transform(s => new Date(s)).optional(),
  until: z.string().transform(s => new Date(s)).optional(),
})

const ScrapeUserLikesSchema = z.object({
  accountId: z.string().min(1),
  username: z.string().min(1),
  maxLikes: z.number().min(1).max(200).default(50),
})

const ScrapeTweetRepliesSchema = z.object({
  accountId: z.string().min(1),
  tweetUrl: z.string().url(),
  maxReplies: z.number().min(1).max(100).default(30),
})

const ScrapeTimelineSchema = z.object({
  accountId: z.string().min(1),
  maxTweets: z.number().min(1).max(100).default(50),
})

const SearchTweetsSchema = z.object({
  accountId: z.string().min(1),
  query: z.string().min(1).max(500),
  maxTweets: z.number().min(1).max(200).default(50),
  since: z.string().transform(s => new Date(s)).optional(),
  until: z.string().transform(s => new Date(s)).optional(),
})

const ScrapeFollowersSchema = z.object({
  accountId: z.string().min(1),
  username: z.string().min(1),
  maxCount: z.number().min(1).max(200).default(50),
})

const ScrapeProfileSchema = z.object({
  accountId: z.string().min(1),
  username: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'userTweets': {
        const data = ScrapeUserTweetsSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const tweets = await scraper.scrapeUserTweets(data.username, {
          maxTweets: data.maxTweets,
          includeReplies: data.includeReplies,
          includeRetweets: data.includeRetweets,
          since: data.since,
          until: data.until,
        })

        return NextResponse.json({
          success: true,
          data: {
            tweets,
            count: tweets.length,
            username: data.username,
          },
        })
      }

      case 'userLikes': {
        const data = ScrapeUserLikesSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const likes = await scraper.scrapeUserLikes(data.username, data.maxLikes)

        return NextResponse.json({
          success: true,
          data: {
            likes,
            count: likes.length,
            username: data.username,
          },
        })
      }

      case 'tweetReplies': {
        const data = ScrapeTweetRepliesSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const replies = await scraper.scrapeTweetReplies(data.tweetUrl, data.maxReplies)

        return NextResponse.json({
          success: true,
          data: {
            replies,
            count: replies.length,
            tweetUrl: data.tweetUrl,
          },
        })
      }

      case 'timeline': {
        const data = ScrapeTimelineSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const tweets = await scraper.scrapeTimeline(data.maxTweets)

        return NextResponse.json({
          success: true,
          data: {
            tweets,
            count: tweets.length,
          },
        })
      }

      case 'search': {
        const data = SearchTweetsSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const tweets = await scraper.searchTweets(data.query, {
          maxTweets: data.maxTweets,
          since: data.since,
          until: data.until,
        })

        return NextResponse.json({
          success: true,
          data: {
            tweets,
            count: tweets.length,
            query: data.query,
          },
        })
      }

      case 'followers': {
        const data = ScrapeFollowersSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const followers = await scraper.scrapeFollowers(data.username, data.maxCount)

        return NextResponse.json({
          success: true,
          data: {
            followers,
            count: followers.length,
            username: data.username,
          },
        })
      }

      case 'following': {
        const data = ScrapeFollowersSchema.parse(body)
        const scraper = createTweetScraper(data.accountId)

        const following = await scraper.scrapeFollowing(data.username, data.maxCount)

        return NextResponse.json({
          success: true,
          data: {
            following,
            count: following.length,
            username: data.username,
          },
        })
      }

      case 'profile': {
        const data = ScrapeProfileSchema.parse(body)
        const xAutomation = createXAutomation(data.accountId)

        const profile = await xAutomation.getProfile(data.username)

        if (!profile) {
          return NextResponse.json(
            { error: 'Profile not found or could not be scraped' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { profile },
        })
      }

      case 'trending': {
        const data = z.object({ accountId: z.string().min(1) }).parse(body)
        const scraper = createTweetScraper(data.accountId)

        const trends = await scraper.scrapeTrending()

        return NextResponse.json({
          success: true,
          data: {
            trends,
            count: trends.length,
          },
        })
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: [
              'userTweets',
              'userLikes',
              'tweetReplies',
              'timeline',
              'search',
              'followers',
              'following',
              'profile',
              'trending',
            ],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Scrape error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Scrape failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
