import { z } from 'zod';
import { prisma } from '../prisma';
import { adminProcedure, publicProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { Movie, MovieNight } from '@prisma/client';
import { ee } from './movie';

export const movieNightRouter = router({
  getNextMovieNight: publicProcedure.query(async ({}) => {
    return await prisma.movieNight.findFirst({
      where: {
        OR: [
          {
            startingAt: {
              gte: new Date(),
            },
          },
          {
            completed: false,
          },
        ],
      },
      include: {
        movies: true,
      },
      orderBy: {
        startingAt: 'asc',
      },
    });
  }),
  addMovieNight: adminProcedure
    .input(z.object({ title: z.string().optional(), startingAt: z.date() }))
    .mutation(async ({ input, ctx }) => {
      const movieNights = await prisma.movieNight.count();
      const movieNight = await prisma.movieNight
        .create({
          data: {
            title: input.title ?? `Movie Night ${movieNights + 1}`,
            startingAt: input.startingAt,
          },
          include: {
            movies: true,
          },
        })
        .catch((e) => {
          console.log(e);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to create movie night, already exists?',
          });
        });
      ee.emit('movieNightUpdate', movieNight);
      return movieNight;
    }),
  updateMovieNight: adminProcedure
    .input(
      z.object({
        movieNightId: z.number(),
        title: z.string().optional(),
        startingAt: z.date().optional(),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const movieNight = await prisma.movieNight.update({
        where: {
          id: input.movieNightId,
        },
        data: {
          title: input.title,
          startingAt: input.startingAt,
          completed: input.completed,
        },
        include: {
          movies: true,
        },
      });
      ee.emit('movieNightUpdate', movieNight);
      return movieNight;
    }),
  getMovieNights: adminProcedure.query(async ({}) => {
    return await prisma.movieNight.findMany({
      include: {
        movies: true,
      },
      orderBy: {
        startingAt: 'desc',
      },
    });
  }),
  addMovieToMovieNight: adminProcedure
    .input(
      z.object({
        movieId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const movieNight = await prisma.movieNight.findFirst({
        where: {
          OR: [
            {
              startingAt: {
                gte: new Date(),
              },
            },

            {
              completed: false,
            },
          ],
        },
        include: {
          movies: true,
        },
        orderBy: {
          startingAt: 'asc',
        },
      });
      if (!movieNight) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No movie night found',
        });
      }
      const movie = await prisma.movie.update({
        where: {
          id: input.movieId,
        },
        data: {
          movieNightId: movieNight.id,
        },
        include: {
          submittedBy: {
            select: {
              name: true,
              image: true,
            },
          },
          votes: {
            select: {
              userId: true,
            },
          },
        },
      });
      movieNight.movies.push(movie);
      ee.emit('movieNightUpdate', movieNight);
      return movie;
    }),

  removeMovieFromNight: adminProcedure
    .input(
      z.object({
        movieId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const movie = await prisma.movie.update({
        where: {
          id: input.movieId,
        },
        data: {
          movieNightId: null,
        },
        include: {
          submittedBy: {
            select: {
              name: true,
              image: true,
            },
          },
          votes: {
            select: {
              userId: true,
            },
          },
        },
      });
      // ee.emit('movieNightUpdate', movieNight);
      return movie;
    }),

  markAsCompleted: adminProcedure
    .input(
      z.object({
        movieNightId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const movieNight = await prisma.movieNight.update({
        where: {
          id: input.movieNightId,
        },
        data: {
          completed: true,
          movies: {
            updateMany: {
              where: {
                watched: false,
              },
              data: {
                watched: true,
              },
            },
          },
        },
        include: {
          movies: true,
        },
      });
      ee.emit('movieNightUpdate', movieNight);
      return movieNight;
    }),

  clearAllVotes: adminProcedure.mutation(async ({ ctx }) => {
    const result = await prisma.movie
      .deleteMany({
        where: {
          banned: false,
        },
      })
      .then(() => true)
      .catch(() => false);

    return result;
  }),
  onMovieNightUpdate: publicProcedure.subscription(({}) => {
    return observable<MovieNight & { movies: Movie[] }>((emit) => {
      const onUpdate = (data: MovieNight & { movies: Movie[] }) => {
        emit.next(data);
      };
      ee.on('movieNightUpdate', onUpdate);
      return () => {
        ee.off('movieNightUpdate', onUpdate);
      };
    });
  }),
});
