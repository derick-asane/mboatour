/// What a receipt needs loading with a booking, kept beside the builder so the
/// query and the document cannot drift apart.
export const prismaBookingInclude = {
  user: { select: { name: true, email: true } },
  payment: true,
  event: {
    select: {
      title: true,
      startsAt: true,
      location: true,
      currency: true,
      siteId: true,
      site: { select: { name: true, slug: true } },
    },
  },
} as const;
