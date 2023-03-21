import React from 'react';
import Countdown from 'react-countdown';
import { trpc } from '../utils/trpc';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Movie, MovieNight as IMovieNight } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Icon, InlineIcon } from '@iconify/react';
import { NextLinkComposed } from './Link';
type Props = {};

export default function MovieNight({}: Props) {
  const [nextMovieNight, setNextMovieNight] = React.useState<
    (IMovieNight & { movies: Movie[] }) | null
  >(null);
  const nextMovieNightData = trpc.movieNight.getNextMovieNight.useQuery(
    undefined,
    {
      refetchOnMount: true,
      onSuccess: (data) => {
        setNextMovieNight(data);
      },
    },
  );
  const removeMovieFromNight = trpc.movieNight.removeMovieFromNight.useMutation(
    {
      onSuccess: (data) => {
        nextMovieNightData.refetch();
      },
    },
  );
  const markAsCompleted = trpc.movieNight.markAsCompleted.useMutation();

  trpc.movieNight.onMovieNightUpdate.useSubscription(undefined, {
    onData: (data) => {
      if (data.id === nextMovieNight?.id) {
        setNextMovieNight(data);
      }
    },
  });

  const [currentTime, setCurrentTime] = React.useState(new Date());

  const { data: session } = useSession();
  React.useEffect(() => {
    nextMovieNightData.refetch();
  }, []);

  if (nextMovieNightData.isLoading) {
    return (
      <Paper
        elevation={2}
        sx={{
          width: { xs: '100%', md: '75%', xl: '66%' },
          height: { xs: 100, md: 175 },
          padding: 2,
          fontFamily: 'Comic Sans MS, Comic Sans, Roboto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          borderRadius: { xs: 0, md: 6 },
          outline: '2px solid gray',
          flexShrink: 0,
        }}
      >
        <CircularProgress color="info" />
        Loading...
      </Paper>
    );
  }
  return (
    <Paper
      elevation={2}
      sx={{
        width: { xs: '100%', md: '75%', xl: '66%' },
        height: { xs: 100, md: 175 },
        padding: 2,
        fontFamily: 'Comic Sans MS, Comic Sans, Roboto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        borderRadius: { xs: 0, md: 6 },
        outline: '2px solid gray',
      }}
    >
      <Stack
        direction="column"
        gap={1}
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          fontFamily="inherit"
          variant="h5"
          fontSize={{ xs: 14, md: 20, xl: 30 }}
          textAlign="center"
          fontWeight={600}
        >
          Next Movie Night
        </Typography>
        <Typography
          fontFamily="inherit"
          variant="h4"
          fontWeight={600}
          fontSize={{ xs: 16, md: 24, xl: 32 }}
          textAlign="center"
          color="primary"
        >
          {nextMovieNight?.title}
        </Typography>
        {session?.user?.role === 'admin' && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => {
              if (!nextMovieNight?.id) return;
              markAsCompleted.mutate({
                movieNightId: nextMovieNight?.id,
              });
            }}
          >
            Mark as completed
          </Button>
        )}
      </Stack>
      <Stack direction="column" spacing={0.5}>
        <Typography
          textAlign="center"
          fontFamily="inherit"
          fontSize={{
            xs: 15,
            md: 20,
            xl: 32,
          }}
        >
          {nextMovieNight?.startingAt.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </Typography>
        {(nextMovieNight?.startingAt ?? 0) > currentTime ? (
          <Countdown
            date={nextMovieNight?.startingAt}
            renderer={({ days, hours, minutes, seconds }) => {
              return (
                <Typography
                  component="div"
                  fontFamily="inherit"
                  fontWeight={600}
                  fontSize={{ xs: 18, md: 32, xl: 42 }}
                  textAlign="center"
                  variant="h3"
                >
                  <span
                    style={{
                      display: days == 0 ? 'none' : 'inline',
                    }}
                  >
                    {days}d{' '}
                  </span>
                  <span
                    style={{
                      display: days == 0 && hours == 0 ? 'none' : 'inline',
                    }}
                  >
                    {hours}h{' '}
                  </span>
                  <span
                    style={{
                      display:
                        days == 0 && hours == 0 && minutes == 0
                          ? 'none'
                          : 'inline',
                    }}
                  >
                    {minutes}m{' '}
                  </span>
                  <span
                    style={{
                      display:
                        days == 0 && hours == 0 && minutes == 0 && seconds == 0
                          ? 'none'
                          : 'inline',
                    }}
                  >
                    {seconds}s
                  </span>
                </Typography>
              );
            }}
          />
        ) : !!nextMovieNight ? (
          <Typography
            component={NextLinkComposed}
            to={`https://kick.com/escrimah`}
            target="movienightstream"
            fontFamily="inherit"
            color="text.primary"
            fontWeight={600}
            fontSize={{ xs: 16, md: 32, xl: 42 }}
            textAlign="center"
            variant="h3"
            sx={{
              textDecoration: 'none',
              backgroundColor: '#ff4444',
              borderRadius: 4,
              padding: 1,
              px: 4,

              boxShadow: '0 0 0 2px #ff4444',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: '#ff4444',
                boxShadow: '0 0 0 4px #ff4444',
              },
            }}
          >
            LIVE NOW
            <InlineIcon
              fontSize={16}
              icon="fa6-solid:arrow-up-right-from-square"
              style={{
                position: 'absolute',
                margin: 4,
              }}
            />
          </Typography>
        ) : (
          <Typography
            variant="h3"
            fontWeight={600}
            fontSize={{ xs: 16, md: 32, xl: 42 }}
            textAlign="center"
          >
            No Movie Night Scheduled Yet
          </Typography>
        )}
      </Stack>
      <MovieList
        nightData={nextMovieNight}
        isAdmin={session?.user?.role === 'admin'}
        onRemoveMovie={(movieId) => {
          removeMovieFromNight.mutateAsync({
            movieId,
          });
        }}
      />
    </Paper>
  );
}

interface MovieListProps {
  nightData: (IMovieNight & { movies: Movie[] }) | null | undefined;
  isAdmin: boolean;
  onRemoveMovie?: (movieId: number) => void;
}

function MovieList({ nightData, isAdmin, onRemoveMovie }: MovieListProps) {
  return (
    <Stack
      className="flex-grow"
      direction="row"
      gap={1}
      alignItems="center"
      justifyContent="center"
      sx={{
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 1,
        // maxWidth: {
        //   xs: '200',
        // },
      }}
    >
      {nightData?.movies?.length ?? 0 > 0 ? (
        nightData?.movies.map((movie) => {
          return (
            <Box
              key={`small-box-movie-${movie.id}`}
              sx={{
                position: 'relative',
                '&:hover .visible-on-hover': {
                  opacity: 1,
                },
                '& .visible-on-hover': {
                  opacity: 0,
                },
              }}
            >
              <Tooltip title={movie.title} placement="top">
                <Box
                  component="img"
                  src={`https://image.tmdb.org/t/p/w220_and_h330_face${movie.image}`}
                  alt={movie.title}
                  sx={{
                    height: { xs: 85, md: 150 },
                    borderRadius: { xs: 1.5, md: 3 },
                    border: '2px solid gray',
                  }}
                />
              </Tooltip>
              {isAdmin && (
                <IconButton
                  className="visible-on-hover"
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    aspectRatio: 1,
                    right: 12,
                    fontSize: 14,
                    padding: 1,
                    color: 'white',
                    transition: 'opacity 0.1s ease-in-out',
                    backgroundColor: 'red',
                    '&:hover': {
                      backgroundColor: 'red',
                    },
                  }}
                  title="Remove Movie"
                  onClick={() => {
                    onRemoveMovie?.(movie.id);
                  }}
                >
                  <Icon icon="fa6-solid:x" />
                </IconButton>
              )}
            </Box>
          );
        })
      ) : (
        <Typography
          fontFamily="inherit"
          textAlign="center"
          fontWeight={600}
          fontSize={20}
        >
          No Movies Selected Yet
        </Typography>
      )}
    </Stack>
  );
}
