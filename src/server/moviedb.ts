import { MovieDb } from 'moviedb-promise';

const movieDb = new MovieDb(process.env.TMDB_KEY!);

export default movieDb;
