import React, { useEffect, useRef } from 'react';
import { trpc } from '../utils/trpc';
import { Box, Button, ButtonGroup, Stack, Typography } from '@mui/material';
import { useSession } from 'next-auth/react';
import { Movie } from '@prisma/client';

type Props = {};

type IMovie = Movie & {
  votes: {
    userId: string;
  }[];
  submittedBy: {
    image: string | null;
    name: string | null;
  };
};

export default function MovieList({}: Props) {
  const moviesQuery = trpc.movie.infinite.useInfiniteQuery(
    {
      take: 15,
    },
    {
      getPreviousPageParam: (lastPage) => lastPage.prevCursor,
      // refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    moviesQuery.refetch();
  }, []);

  const utils = trpc.useContext();

  const [movies, setMovies] = React.useState<IMovie[]>(() => {
    const msgs = moviesQuery.data?.pages.map((page) => page.items).flat();
    return msgs ?? [];
  });

  const addMovies = React.useCallback((incoming?: IMovie[]) => {
    setMovies((current) => {
      const map: Record<IMovie['id'], IMovie> = {};
      for (const msg of current ?? []) {
        map[msg.id] = msg;
      }
      for (const msg of incoming ?? []) {
        map[msg.id] = msg;
      }
      return Object.values(map).sort((a, b) => b.votes.length - a.votes.length);
    });
  }, []);
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  const addToMovieNight = trpc.movieNight.addMovieToMovieNight.useMutation({
    onSuccess: (data) => {
      addMovies([data]);
    },
  });

  React.useEffect(() => {
    const msgs = moviesQuery.data?.pages.map((page) => page.items).flat();
    addMovies(msgs);
  }, [moviesQuery.data?.pages, addMovies]);

  const onAddMovieToMovieNight = React.useCallback(
    (movieId: number) => {
      addToMovieNight.mutate({ movieId });
    },
    [addToMovieNight],
  );

  trpc.movie.onAdd.useSubscription(undefined, {
    onData(movie) {
      addMovies([movie]);
    },
    onError(err) {
      console.error('Subscription error:', err);
      // we might have missed a message - invalidate cache
      utils.movie.infinite.invalidate();
    },
  });

  trpc.movie.onVote.useSubscription(undefined, {
    onData: (movie) => {
      addMovies([movie]);
    },
  });

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{ width: '95%', overflowY: 'scroll', pb: 12, px: 2 }}
    >
      {movies.map((movie, i) => (
        <VotableMovie
          movie={movie}
          addMovieNight={onAddMovieToMovieNight}
          key={`movie-option-${movie.id}`}
        />
      ))}
      <Button
        data-testid="loadMore"
        onClick={() => moviesQuery.fetchPreviousPage()}
        disabled={
          !moviesQuery.hasPreviousPage || moviesQuery.isFetchingPreviousPage
        }
        className=""
      >
        {moviesQuery.isFetchingPreviousPage ? 'Loading...' : 'Load more'}
      </Button>
    </Stack>
  );
}

interface VotableMovieProps {
  movie: IMovie;
  addMovieNight: (movieId: number) => void;
}
function VotableMovie({ movie, addMovieNight }: VotableMovieProps) {
  const { data: session, status } = useSession();
  const vote = trpc.movie.vote.useMutation();
  const addToMovieNight = trpc.movieNight.addMovieToMovieNight.useMutation();
  const banMovie = trpc.movie.banMovie.useMutation();

  const userVoted =
    movie.votes.findIndex((v) => v.userId === session?.user?.id) !== -1;
  if (session?.user?.role !== 'admin' && movie.banned) return null;

  if (movie.watched) return null;
  return (
    <Stack
      direction="row"
      sx={{
        '& > img': { mr: 2, flexShrink: 0 },
        position: 'relative',
        borderRadius: 4,
        backgroundColor: userVoted ? '#44338877' : '#44444422',
        p: 2,
        transition: 'background-color 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: userVoted ? '#443388' : '#44444477',
        },
      }}
      onClick={() => {
        vote.mutateAsync({ id: movie.id });
      }}
    >
      {movie.image ? (
        <img
          loading="lazy"
          style={{ width: 96, objectFit: 'cover' }}
          className="rounded-md overflow-hidden"
          draggable={false}
          src={`https://image.tmdb.org/t/p/w220_and_h330_face${movie.image}`}
          srcSet={`https://image.tmdb.org/t/p/w440_and_h660_face${movie.image} 2x`}
          alt={movie.title}
        />
      ) : null}
      <Stack direction="column">
        <Typography variant="h6">{movie.title}</Typography>

        <Typography
          variant="body2"
          sx={{
            // maxHeight: 64,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            // display: '-webkit-box',
            // webkitLineClamp: 3,
            // webkitBoxOrient: 'vertical',
          }}
        >
          {movie.description?.split(' ').slice(0, 35).join(' ')}
        </Typography>
        <div className="flex-grow" />
        <Typography>
          Submitted by {movie.submittedBy?.name || 'Anonymous'}
        </Typography>
        <div className="absolute top-2 right-2">
          <Typography variant="body2" color="text.secondary">
            Release Date: {movie.releaseDate}
          </Typography>
        </div>
        <div className="absolute bottom-2 right-2 flex flex-row items-center gap-2">
          {session?.user?.role === 'admin' && (
            <ButtonGroup variant="contained">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  banMovie.mutate({ id: movie.id });
                }}
              >
                {movie.banned ? 'Unban' : 'Ban'}
              </Button>
              <Button
                disabled={!!movie.movieNightId}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addMovieNight(movie.id);
                }}
              >
                Add to Movie Night
              </Button>
            </ButtonGroup>
          )}
          <Typography variant="body2" color="text.primary" fontSize={20}>
            Votes: {movie.votes.length}
          </Typography>
        </div>
      </Stack>
    </Stack>
  );
}
