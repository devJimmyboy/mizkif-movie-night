import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { trpc } from '../../utils/trpc';
import { Movie, MovieNight } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { useFormik } from 'formik';
import moment, { Moment } from 'moment';
import { DateTimePicker } from '@mui/x-date-pickers';

type Props = {};

export default function EditMovieNightForm({}: Props) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [movieNights, setMovieNights] = React.useState<
    (MovieNight & {
      movies: Movie[];
    })[]
  >([]);
  const movieNightData = trpc.movieNight.getMovieNights.useQuery(undefined, {});
  React.useEffect(() => {
    if (movieNightData.data) {
      setMovieNights(movieNightData.data);
    }
  }, [movieNightData.data]);
  return (
    <Card sx={{ width: 750, height: 600 }}>
      <CardHeader title="Edit Movie Nights" />
      <Stack direction="row">
        <List component="nav" sx={{ width: 250, height: '100%' }}>
          {movieNights.map((movieNight, index) => (
            <ListItemButton
              key={movieNight.id}
              selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
            >
              <Box>
                <Typography variant="h6">{movieNight.title}</Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
        {movieNights.length > 0 && (
          <EditMovieNight movie={movieNights[selectedIndex]} />
        )}
      </Stack>
    </Card>
  );
}

interface EditMovieNightFormProps {
  title: string;
  startingAt: Moment;
  completed: boolean;
}

function EditMovieNight({ movie }: { movie: MovieNight }) {
  const editMovieNight = trpc.movieNight.updateMovieNight.useMutation({
    onSuccess(data) {
      toast.success(`Movie Night ${data.title} Updated!`);
    },
  });
  const formik = useFormik<EditMovieNightFormProps>({
    initialValues: {
      startingAt: moment(movie.startingAt),
      title: movie.title ?? '',
      completed: movie.completed,
    },
    onSubmit: (values) => {
      const vals: Parameters<typeof editMovieNight.mutate>[0] = {
        movieNightId: movie.id,
        startingAt: values.startingAt.toDate(),
        title: values.title.length > 0 ? values.title : undefined,
        completed: values.completed,
      };
      console.log(vals);
      editMovieNight.mutate(vals);
    },
  });
  return (
    <CardContent
      component="form"
      onSubmit={formik.handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <TextField
        fullWidth
        id="title"
        name="title"
        label="Title"
        value={formik.values.title}
        onChange={formik.handleChange}
      />
      <DateTimePicker
        value={formik.values.startingAt}
        label="Movie Night Starting At:"
        onChange={(value) => {
          formik.setFieldValue('startingAt', value);
        }}
        // renderInput={(props) => <TextField {...props} />}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={editMovieNight.isLoading}
        className="align-self-end"
      >
        Edit Movie Night
      </Button>

      {editMovieNight.error && (
        <p>Something went wrong! {editMovieNight.error.message}</p>
      )}
    </CardContent>
  );
}
