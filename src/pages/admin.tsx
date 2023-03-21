import type { GetServerSideProps, NextPage } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import { trpc } from '../utils/trpc';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Modal,
  Stack,
  TextField,
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { useFormik } from 'formik';
import moment, { Moment } from 'moment';
import React from 'react';
import { toast } from 'react-hot-toast';
import EditMovieNightForm from '../components/admin/EditMovieNightForm';
import { Icon } from '@iconify/react';
interface Props {}

const Page: NextPage = ({}: Props) => {
  const [addMovieNightOpen, setAddMovieNightOpen] = React.useState(false);
  const [resetVotesOpen, setResetVotesOpen] = React.useState(false);
  const { mutate } = trpc.movieNight.clearAllVotes.useMutation();
  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Head>
        <title>Offline Movie Nights - Admin</title>
      </Head>
      <Box className="flex flex-col h-screen items-center gap-2 px-12">
        <h1 className="text-4xl font-bold">Admin</h1>
        <Stack direction="row" className="w-full" spacing={6}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setAddMovieNightOpen(true);
            }}
          >
            Add Movie Night
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Icon icon="fa-solid:trash" />}
            fullWidth
            onClick={() => {
              setResetVotesOpen(true);
            }}
          >
            Reset All Votes
          </Button>
        </Stack>
        <EditMovieNightForm />

        <Dialog
          open={addMovieNightOpen}
          onClose={() => {
            setAddMovieNightOpen(false);
          }}
        >
          <AddMovieNightForm />
        </Dialog>
        <Dialog
          open={resetVotesOpen}
          onClose={() => {
            setResetVotesOpen(false);
          }}
        >
          <DialogTitle>
            Are you sure you would like to reset ALL currently voted movies?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will reset all voted for movies except for those that have
              been banned (users can't see banned movies). This action cannot be
              undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setResetVotesOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                mutate();
                setResetVotesOpen(false);
              }}
              color="error"
            >
              Reset Votes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

interface AddMovieNightFormProps {
  startingAt: Moment;
  title: string;
}

function AddMovieNightForm() {
  const addMovieNight = trpc.movieNight.addMovieNight.useMutation({
    onSuccess(data) {
      toast.success(`Movie night ${data.title} added`);
    },
  });
  const formik = useFormik<AddMovieNightFormProps>({
    initialValues: {
      startingAt: moment().add(1, 'hour').startOf('hour'),
      title: '',
    },
    onSubmit: (values) => {
      const vals: Parameters<typeof addMovieNight.mutate>[0] = {
        ...values,
        startingAt: values.startingAt.toDate(),
        title: values.title.length > 0 ? values.title : undefined,
      };
      console.log(vals);
      addMovieNight.mutate(vals);
    },
  });
  return (
    <Card variant="outlined" sx={{ width: 500 }}>
      <CardHeader title="Add New Movie Night" />
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
          minDateTime={moment()}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={addMovieNight.isLoading}
          className="align-self-end"
        >
          Add Movie Night
        </Button>

        {addMovieNight.error && (
          <p>Something went wrong! {addMovieNight.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default Page;

export const getServerSideProps: GetServerSideProps<{}> = async function (
  context,
) {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  } else if (session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  return {
    props: {},
  };
};
