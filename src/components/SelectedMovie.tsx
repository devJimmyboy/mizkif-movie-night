import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { MovieResult } from 'moviedb-promise';
import { signIn, useSession } from 'next-auth/react';
import React from 'react';
import { trpc } from '../utils/trpc';

type Props = {
  movie: MovieResult;
  onCancel: () => void;
  onSubmit: () => void;
  loading?: boolean;
};

export default function SelectedMovie({
  movie,
  onCancel,
  onSubmit,
  loading,
}: Props) {
  const { data: session, status } = useSession();
  const movieInfo = trpc.movie.findMovie.useQuery({ id: movie.id! });
  const vote = trpc.movie.vote.useMutation({
    onSuccess: () => {
      movieInfo.refetch();
    },
  });
  return (
    <Card
      variant="outlined"
      sx={{
        maxWidth: {
          xs: 400,
          md: 550,
          lg: 700,
        },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        flexShrink: 0,
      }}
    >
      <CardMedia
        component="img"
        sx={{
          width: { xs: undefined, md: 200 },
          objectFit: 'cover',
          height: { xs: '100%', md: undefined },
          objectPosition: 'center 25%',
        }}
        draggable={false}
        image={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: '1 0 auto' }}>
          <Typography
            component="div"
            variant="h5"
            fontSize={{ xs: 20, md: 24 }}
          >
            {movie.title}
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            component="div"
            textOverflow="ellipsis"
            overflow="scroll"
            maxHeight={{ xs: 64, md: 128 }}
          >
            {movie.overview}
          </Typography>
        </CardContent>
        <CardActions
          sx={{
            borderTop: 'solid 1px #ffffff2a',
            flexDirection: 'row-reverse',
          }}
        >
          {status === 'authenticated' ? (
            movieInfo.data ? (
              <Button
                size="large"
                color="primary"
                disabled={
                  movieInfo.data.banned ||
                  movieInfo.data.votes.some(
                    (vote) => vote.userId === session.user.id,
                  )
                }
                onClick={() => {
                  vote.mutate({
                    id: movie.id!,
                  });
                }}
              >
                Vote
              </Button>
            ) : (
              <Button
                size="large"
                color="primary"
                disabled={loading}
                onClick={() => {
                  onSubmit();
                }}
              >
                Submit
              </Button>
            )
          ) : (
            <Tooltip title="You have to login to submit a movie!">
              <Button
                size="large"
                color="primary"
                onClick={() => {
                  signIn('twitch');
                }}
              >
                Login
              </Button>
            </Tooltip>
          )}
          <Button
            size="large"
            color="error"
            onClick={() => {
              onCancel();
            }}
          >
            Cancel
          </Button>
          <div className="flex-grow" />
          {movieInfo.data && (
            <Stack direction="column">
              <Typography
                variant="subtitle1"
                color="text.primary"
                component="div"
              >
                {movieInfo.data.votes.length}{' '}
                {movieInfo.data.votes.length === 1 ? 'Vote' : 'Votes'}
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                component="div"
              >
                Already submitted by {movieInfo.data.submittedBy.name}
              </Typography>
            </Stack>
          )}
        </CardActions>
      </Box>
    </Card>
  );
}
