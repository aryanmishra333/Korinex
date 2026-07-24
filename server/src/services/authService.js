import { prisma } from '../db/client.js'

// Turns a verified Google profile (from Passport) into a Korinex user row.
// Finds the existing user by their stable Google id, or creates one.
export async function findOrCreateGoogleUser(profile) {
  const googleId = profile.id
  const email = profile.emails?.[0]?.value
  const name = profile.displayName
  const avatar = profile.photos?.[0]?.value

  return prisma.user.upsert({
    where: { provider_providerId: { provider: 'google', providerId: googleId } },
    // Refresh mutable profile data on every login; leave id/createdAt untouched.
    update: { name, avatarUrl: avatar },
    create: {
      email,
      name,
      avatarUrl: avatar,
      provider: 'google',
      providerId: googleId,
    },
  })
}
