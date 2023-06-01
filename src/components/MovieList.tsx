import React, { useEffect, useRef } from 'react';
import { trpc } from '../utils/trpc';
import {
  Box,
  Button,
  ButtonGroup,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useSession } from 'next-auth/react';
// import { Movie } from '@prisma/client';
import { Icon } from '@iconify/react';
import type { IMovie } from '../server/routers/movie';

type Props = { showBans: boolean };

// type IMovie = Movie & {
//   votes: {
//     userId: string;
//     user: {
//       name: string;
//     };
//   }[];
//   submittedBy: {
//     image: string | null;
//     name: string | null;
//   };
// };

export default function MovieList({ showBans }: Props) {
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
    const movs = moviesQuery.data?.pages.map((page) => page.items).flat();
    return movs ?? [];
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
      sx={{
        width: '95%',
        overflowY: 'scroll',
        overflowX: 'hidden',
        pb: 6,
        px: 0,
        zIndex: 0,
        // pr: 4,
      }}
    >
      {movies.map((movie, i) =>
        !showBans && movie.banned ? null : (
          <VotableMovie
            movie={movie}
            addMovieNight={onAddMovieToMovieNight}
            key={`movie-option-${movie.id}`}
          />
        ),
      )}
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
  const [showVoters, setShowVoters] = React.useState(false);
  const userVoted =
    movie.votes.findIndex((v) => v.userId === session?.user?.id) !== -1;
  if (session?.user?.role !== 'admin' && movie.banned) return null;

  if (movie.watched) return null;
  return (
    <div className="flex flex-row max-w-full w-full pr-4">
      <Stack
        direction="row"
        // className="flex-grow"
        sx={{
          '& > img': { mr: 2, flexShrink: 0 },
          position: 'relative',
          borderRadius: 4,
          backgroundColor: userVoted ? '#362a66' : '#1f1f1f',
          p: 2,
          transition: 'background-color 0.2s ease',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: userVoted ? '#443388' : '#242424',
          },
          zIndex: 2,
          width: '100%',
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
            <IconButton
              color="primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowVoters((prev) => !prev);
              }}
              sx={{
                borderRadius: '1.25em',
              }}
            >
              <Icon
                icon={
                  showVoters
                    ? 'fa-solid:angle-double-right'
                    : 'fa-solid:angle-double-left'
                }
              />
            </IconButton>
          </div>
        </Stack>
      </Stack>
      <Collapse
        orientation="horizontal"
        in={showVoters}
        sx={{ zIndex: 1 }}
        timeout={125}
        easing="cubic-bezier(.29,0,.52,1.26)"
      >
        <Stack
          direction="column"
          spacing={0.25}
          sx={{
            position: 'relative',
            left: -12,
            my: 1,
            py: 0.5,
            px: 1,
            pl: 2,
            mr: 1,
            minHeight: 175,
            maxHeight: 175,
            // width: '10vw',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            cursor: 'default',
            backgroundColor: '#181818',
            borderRadius: '0 12px 12px 0',
          }}
        >
          {movie.votes.map((vote) => (
            <Typography key={vote.userId} variant="body2">
              {vote.user.name}
            </Typography>
          ))}
        </Stack>
      </Collapse>
    </div>
  );
}
