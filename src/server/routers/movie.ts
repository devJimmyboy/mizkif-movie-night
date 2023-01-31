/**
 *
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { Movie, MovieNight } from '@prisma/client';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { prisma } from '../prisma';
import { z } from 'zod';
import { authedProcedure, publicProcedure, router } from '../trpc';
import { MovieDb } from 'moviedb-promise';
import movieDb from '../moviedb';
import { TRPCError } from '@trpc/server';

type IMovie = Movie & {
  votes: {
    userId: string;
  }[];
  submittedBy: {
    image: string | null;
    name: string | null;
  };
};
interface MyEvents {
  add: (data: IMovie) => void;
  vote: (data: IMovie) => void;
  movieNightUpdate: (data: MovieNight & { movies: Movie[] }) => void;
}
declare interface MyEventEmitter {
  on<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  off<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  once<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  emit<TEv extends keyof MyEvents>(
    event: TEv,
    ...args: Parameters<MyEvents[TEv]>
  ): boolean;
}

class MyEventEmitter extends EventEmitter {}

// In a real app, you'd probably use Redis or something
export const ee = new MyEventEmitter();

// who is currently typing, key is `name`
// const currentlyTyping: Record<string, { lastTyped: Date }> = Object.create(null);

// every 1s, clear old "isTyping"
// const interval = setInterval(() => {
//   let updated = false;
//   const now = Date.now();
//   for (const [key, value] of Object.entries(currentlyTyping)) {
//     if (now - value.lastTyped.getTime() > 3e3) {
//       delete currentlyTyping[key];
//       updated = true;
//     }
//   }
//   if (updated) {
//     ee.emit('isTypingUpdate');
//   }
// }, 3e3);
// process.on('SIGTERM', () => clearInterval(interval));

export const movieRouter = router({
  add: authedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { name } = ctx.user;
      const movieInfo = await movieDb.movieInfo({
        id: input.id,
      });
      const nextMovieNight = await prisma.movieNight.findFirst({
        where: {
          startingAt: {
            gte: new Date(),
          },
        },
        include: {
          movies: true,
        },
      });
      console.log(movieInfo);
      const movie = await prisma.movie.create({
        data: {
          // ...input,
          title: movieInfo.title ?? movieInfo.original_title ?? 'Unknown Movie',
          id: movieInfo.id!,
          description: movieInfo.overview!,
          image: movieInfo.poster_path!,
          submitter: ctx.user.id,
          releaseDate: movieInfo.release_date!,
          votes: {
            create: {
              userId: ctx.user.id,
            },
          },
        },
        include: {
          votes: {
            select: {
              userId: true,
            },
          },
          submittedBy: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });
      ee.emit('add', movie);
      // delete currentlyTyping[name];
      // ee.emit('isTypingUpdate');
      return movieInfo;
    }),

  // isTyping: authedProcedure
  //   .input(z.object({ typing: z.boolean() }))
  //   .mutation(({ input, ctx }) => {
  //     const { name } = ctx.user;
  //     if (!input.typing) {
  //       delete currentlyTyping[name];
  //     } else {
  //       currentlyTyping[name] = {
  //         lastTyped: new Date(),
  //       };
  //     }
  //     ee.emit('isTypingUpdate');
  //   }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return movieDb.searchMovie({ query: input.query });
    }),

  infinite: publicProcedure
    .input(
      z.object({
        cursor: z.date().nullish(),
        take: z.number().min(1).max(50).nullish(),
      }),
    )
    .query(async ({ input }) => {
      const take = input.take ?? 10;
      const cursor = input.cursor;

      const page = await prisma.movie.findMany({
        orderBy: {
          votes: {
            _count: 'desc',
          },
        },
        cursor: cursor ? { createdAt: cursor } : undefined,
        take: take + 1,
        skip: 0,
        include: {
          votes: {
            select: {
              userId: true,
            },
          },
          submittedBy: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });
      const items = page.reverse();
      let prevCursor: null | typeof cursor = null;
      if (items.length > take) {
        const prev = items.shift();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        prevCursor = prev!.createdAt;
      }
      return {
        items,
        prevCursor,
      };
    }),

  findMovie: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await prisma.movie.findUnique({
        where: {
          id: input.id,
        },
        include: {
          submittedBy: true,
          votes: {
            select: {
              userId: true,
            },
          },
        },
      });
    }),

  currentMovie: authedProcedure.query(async ({ ctx }) => {
    const { id } = ctx.user;
    // const nextMovieNight = await prisma.movieNight.findFirst({
    //   where: {
    //     startingAt: {
    //       gte: new Date(),
    //     },
    //   },
    //   include: {
    //     movies: true,
    //   },
    // });
    const movie = await prisma.movie
      .findFirst({
        where: {
          submitter: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((e) => {
        console.error("Couldn't find movie for user", ctx.user.name, e);
        return null;
      });
    return movie;
  }),

  vote: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = ctx.user;
      const movie = await prisma.movie.findUnique({
        where: {
          id: input.id,
        },
        include: {
          votes: {
            select: {
              userId: true,
            },
          },
          submittedBy: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });
      if (!movie) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Movie not found' });
      }
      const vote = await prisma.vote.findUnique({
        where: {
          movieId_userId: {
            userId: id,
            movieId: movie.id,
          },
        },
      });
      if (vote) {
        const deletedVote = await prisma.vote.delete({
          where: {
            movieId_userId: {
              userId: id,
              movieId: movie.id,
            },
          },
        });
        movie.votes = movie.votes.filter(
          (v) => v.userId !== deletedVote.userId,
        );
        ee.emit('vote', movie);
        return;
      }
      const newVote = await prisma.vote.create({
        data: {
          movieId: movie.id,
          userId: id,
        },
      });
      movie.votes.push(newVote);
      ee.emit('vote', movie);
    }),

  onAdd: publicProcedure.subscription(() => {
    return observable<IMovie>((emit) => {
      const onAdd = (data: IMovie) => emit.next(data);
      ee.on('add', onAdd);
      return () => {
        ee.off('add', onAdd);
      };
    });
  }),

  onVote: publicProcedure
    .input(
      z
        .object({
          id: z.number(),
        })
        .nullish(),
    )
    .subscription(({ input }) => {
      return observable<IMovie>((emit) => {
        const onVote = (data: IMovie) => {
          if (input?.id && data.id !== input.id) return;
          emit.next(data);
        };
        ee.on('vote', onVote);
        return () => {
          ee.off('vote', onVote);
        };
      });
    }),

  // whoIsTyping: publicProcedure.subscription(() => {
  //   let prev: string[] | null = null;
  //   return observable<string[]>((emit) => {
  //     const onIsTypingUpdate = () => {
  //       const newData = Object.keys(currentlyTyping);

  //       if (!prev || prev.toString() !== newData.toString()) {
  //         emit.next(newData);
  //       }
  //       prev = newData;
  //     };
  //     ee.on('isTypingUpdate', onIsTypingUpdate);
  //     return () => {
  //       ee.off('isTypingUpdate', onIsTypingUpdate);
  //     };
  //   });
  // }),
});
