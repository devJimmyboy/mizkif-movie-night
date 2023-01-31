import type { Movie } from '@prisma/client';
import React from 'react';
import { trpc } from '../utils/trpc';
import {
  Autocomplete,
  ButtonBase,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { MovieResult } from 'moviedb-promise';

type Props = {
  onChange: (
    event: React.SyntheticEvent<Element, Event>,
    movie: MovieResult | null,
  ) => void;
};

export default function MovieSearch({ onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const options = trpc.movie.search.useQuery(
    { query },
    {
      enabled: query.length > 0,
      refetchOnWindowFocus: false,
    },
  );
  const loading = open && options.isLoading && query.length > 0;

  // React.useEffect(() => {
  //   let active = true;

  //   if (!loading) {
  //     return undefined;
  //   }

  //   (async () => {
  //     if (active) {
  //       setOptions([...topFilms]);
  //     }
  //   })();

  //   return () => {
  //     active = false;
  //   };
  // }, [loading]);

  return (
    <Autocomplete
      id="movie-search"
      sx={{ width: 500 }}
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      isOptionEqualToValue={(option, value) => option.title === value.title}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          if (newValue !== query) setQuery(newValue);
        } else {
          onChange(event, newValue);
        }
      }}
      filterOptions={(x) => x}
      getOptionLabel={(option) =>
        option.title ?? option.original_title ?? 'Unknown Movie'
      }
      // freeSolo
      options={options.data?.results ?? []}
      onInputChange={(event, newInputValue) => {
        setQuery(newInputValue);
      }}
      loading={loading}
      noOptionsText={
        query.length < 1 ? 'Type at least 1 character' : 'No results'
      }
      disableClearable
      autoHighlight
      // disableCloseOnSelect
      renderOption={(props, option, i) => (
        <Stack
          component="li"
          direction="row"
          // key={`movie-option-${i.index}`}
          // spacing={2}
          // className={'w-full h-48 pt-4 ' + props.className}
          sx={{ '& > img': { mr: 2, flexShrink: 0 }, position: 'relative' }}
          {...props}
          key={`movie-option-${i.index}`}
        >
          {option.poster_path ? (
            <img
              loading="lazy"
              style={{ width: 96, objectFit: 'cover' }}
              className="rounded-md overflow-hidden"
              draggable={false}
              src={`https://image.tmdb.org/t/p/w220_and_h330_face${option.poster_path}`}
              srcSet={`https://image.tmdb.org/t/p/w440_and_h660_face${option.poster_path} 2x`}
              alt={option.title}
            />
          ) : null}
          <Stack direction="column">
            <Typography variant="h6">{option.title}</Typography>

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
              {option.overview?.split(' ').slice(0, 35).join(' ')}
            </Typography>
            <div className="absolute top-2 right-2">
              <Typography variant="body2" color="text.secondary">
                Release Date: {option.release_date}
              </Typography>
            </div>
          </Stack>
        </Stack>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search for a movie"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
            // type: 'search',
            ...({ 'data-type': 'other' } as any),
          }}
        />
      )}
    />
  );
}
