// Account Validation Utility
// Validates account existence and status before operations

import prisma from '@/lib/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'

export interface ValidatedAccount {
  id: string
  username: string
  displayName: string | null
  status: string
  isActive: boolean
}

/**
 * Validate that an account exists and is available for operations
 * @throws NotFoundError if account doesn't exist
 * @throws ValidationError if account is suspended, in error state, or inactive
 */
export async function validateAccountForAction(
  accountId: string
): Promise<ValidatedAccount> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      username: true,
      displayName: true,
      status: true,
      isActive: true,
    },
  })

  if (!account) {
    throw new NotFoundError('Account', accountId)
  }

  if (account.status === 'suspended') {
    throw new ValidationError('Account is suspended and cannot perform actions', [
      { field: 'accountId', message: 'Account suspended' },
    ])
  }

  if (account.status === 'error') {
    throw new ValidationError('Account is in error state and cannot perform actions', [
      { field: 'accountId', message: 'Account in error state' },
    ])
  }

  if (!account.isActive) {
    throw new ValidationError('Account is inactive and cannot perform actions', [
      { field: 'accountId', message: 'Account inactive' },
    ])
  }

  return account
}

/**
 * Check if account exists (simple existence check without status validation)
 * @returns Account if found, null otherwise
 */
export async function findAccountById(
  accountId: string
): Promise<ValidatedAccount | null> {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      username: true,
      displayName: true,
      status: true,
      isActive: true,
    },
  })
}

/**
 * Validate account exists and return simple boolean
 */
export async function accountExists(accountId: string): Promise<boolean> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true },
  })
  return !!account
}
