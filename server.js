import express, {json} from 'express';
import router from './routes/index';

const app = express();

app.use(json());

const PORT = process.env.PORT || 5000;

app.use('/', router);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
