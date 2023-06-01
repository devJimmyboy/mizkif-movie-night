import {
  Avatar,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { trpc } from '../utils/trpc';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { signIn, signOut, useSession } from 'next-auth/react';
import Head from 'next/head';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import MovieSearch from '../components/MovieSearch';
import { MovieResult } from 'moviedb-promise';
import SelectedMovie from '../components/SelectedMovie';
import MovieNight from '../components/MovieNight';
import MovieList from '../components/MovieList';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Link, { NextLinkComposed } from '../components/Link';
import { useLocalStorage } from 'react-use';

export default function Home() {
  const currentMovie = trpc.movie.currentMovie.useQuery();
  const addMovie = trpc.movie.add.useMutation({
    onSuccess(data, variables, context) {
      toast.success(`Movie ${data.title} added!`);
    },
    onError(error, variables, context) {
      console.error(error);
      toast.error(error.message, {
        duration: 5000,
      });
    },
  });
  const [selectedMovie, setSelectedMovie] = useState<MovieResult | null>(null);
  const [showBans, setShowBans] = useLocalStorage<boolean>('show-bans', true);

  const { data: session, status } = useSession();

  const isAdmin = session?.user?.role === 'admin';

  // useEffect(() => {
  //   if (currentMovie.data) {
  //     setSelectedMovie(currentMovie.data);
  //   }
  // }, [currentMovie.data]);
  // const [currentlyTyping, setCurrentlyTyping] = useState<string[]>([]);
  // trpc.movie.whoIsTyping.useSubscription(undefined, {
  //   onData(data) {
  //     setCurrentlyTyping(data);
  //   },
  // });

  return (
    <>
      <Head>
        <title>Offline Movie Night</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box className="flex flex-col h-screen items-center gap-8 relative">
        <Typography
          variant="h2"
          textAlign="center"
          className="mt-6 font-semibold"
          component="div"
        >
          <Image
            style={{ position: 'absolute', transform: 'translate(-150%, 0)' }}
            src="https://cdn.betterttv.net/emote/62f03254ecbd418154239b2a/2x"
            width={50}
            height={50}
            alt="Surfin'"
          />
          Offline Movie Night
        </Typography>
        <MovieNight />
        {selectedMovie ? (
          <SelectedMovie
            movie={selectedMovie}
            onCancel={() => {
              setSelectedMovie(null);
            }}
            onSubmit={() => {
              addMovie.mutate({ id: selectedMovie.id! });
            }}
          />
        ) : (
          <MovieSearch
            onChange={(_, movie) => {
              if (movie) {
                setSelectedMovie(movie);
              }
            }}
          />
        )}
        <MovieList showBans={showBans!} />

        <Paper elevation={3} className="p-2 px-4 absolute bottom-6 right-6">
          {status === 'authenticated' ? (
            <Stack direction="row" spacing={2}>
              {isAdmin && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showBans}
                        onClick={() => setShowBans(!showBans)}
                      />
                    }
                    label="Show Bans"
                  />
                  <Button
                    component={NextLinkComposed}
                    to={{
                      pathname: '/admin',
                    }}
                  >
                    Admin
                  </Button>
                </>
              )}
              <Button onClick={() => signOut()}>Sign Out</Button>
              <Avatar src={session.user.image!} />
            </Stack>
          ) : (
            <Button onClick={() => signIn('twitch')}>Sign in</Button>
          )}
        </Paper>
      </Box>
    </>
  );
}

/**
 * If you want to statically render this page
 * - Export `appRouter` & `createContext` from [trpc].ts
 * - Make the `opts` object optional on `createContext()`
 *
 * @link https://trpc.io/docs/ssg
 */
// export const getStaticProps = async (
//   context: GetStaticPropsContext<{ filter: string }>,
// ) => {
//   const ssg = createSSGHelpers({
//     router: appRouter,
//     ctx: await createContext(),
//   });
//
//   await ssg.fetchQuery('post.all');
//
//   return {
//     props: {
//       trpcState: ssg.dehydrate(),
//       filter: context.params?.filter ?? 'all',
//     },
//     revalidate: 1,
//   };
// };
