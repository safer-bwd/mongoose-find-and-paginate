import mongoose from 'mongoose';
import findAndPaginatePlugin from '../src';

let Model;

const dataSet = new Array(12).fill()
  .map((d, index) => {
    const order = index + 1;
    const name = `name${order}`;
    return { name, order };
  });

const docsToArray = docs => Array.from(docs).map(d => d.toJSON());

beforeAll(async () => {
  await mongoose.connect(process.env.DB_MONGO_URI, {
    auth: (process.env.DB_MONGO_USER) ? {
      user: process.env.DB_MONGO_USER,
      password: process.env.DB_MONGO_PASSWORD
    } : null,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  const schema = new mongoose.Schema({
    name: String,
    order: Number
  });

  schema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    /* eslint-disable */
    transform: (doc, ret) => {
      delete ret._id;
      return ret;
    }
    /* eslint-enable */
  });

  schema.plugin(findAndPaginatePlugin);
  Model = mongoose.model('Model', schema);
  const promises = dataSet.map(data => new Model(data).save());
  await Promise.all(promises);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

it('async with skip and limit', async () => {
  const skip = 2;
  const limit = 2;

  const filter = { order: { $lte: 10 } };
  const sort = { order: 1, _id: 1 };
  const query = Model.findAndPaginate(filter, { skip, limit, sort });
  const { docs, totalDocs } = await query;

  const expected = dataSet.filter(d => d.order <= 10)
    .slice(skip, skip + limit);

  expect(docsToArray(docs)).toEqual(expected);
  expect(totalDocs).toBe(10);
});

it('async with page and perPage', async () => {
  const page = 3;
  const perPage = 2;

  const filter = { order: { $lte: 11 } };
  const sort = { order: 1, _id: 1 };
  const query = Model.findAndPaginate(filter, { page, perPage, sort });
  const { docs, totalPages } = await query;

  const expected = dataSet.filter(d => d.order <= 11)
    .slice((page * perPage) - perPage, page * perPage);

  expect(docsToArray(docs)).toEqual(expected);
  expect(totalPages).toBe(6);
});

it('async and chaining methods', async () => {
  const skip = 1;
  const limit = 2;

  const filter = { order: { $lte: 10 } };
  const sort = { order: -1, _id: 1 };

  const query = Model
    .findAndPaginate(filter, { skip, limit, sort })
    .select('name');

  const { docs, totalDocs } = await query;

  const expected = dataSet.filter(d => d.order <= 10)
    .reverse()
    .map(({ name }) => ({ name }))
    .slice(skip, skip + limit);

  expect(docsToArray(docs)).toEqual(expected);
  expect(totalDocs).toBe(10);
});

it('with callback, skip and limit', (done) => {
  const skip = 0;
  const limit = 4;

  const expected = dataSet.filter(d => d.order <= 5)
    .slice(skip, skip + limit);

  const filter = { order: { $lte: 5 } };
  const sort = { order: 1, _id: 1 };
  const options = { skip, limit, sort };

  Model.findAndPaginate(filter, options, (err, result) => {
    const { docs, totalDocs } = result;
    expect(docsToArray(docs)).toEqual(expected);
    expect(totalDocs).toBe(5);
    done();
  });
});

it('with callback, page and perPage', (done) => {
  const page = 2;
  const perPage = 3;

  const expected = dataSet.filter(d => d.order <= 10)
    .slice((page * perPage) - perPage, page * perPage);

  const filter = { order: { $lte: 10 } };
  const sort = { order: 1, _id: 1 };
  const options = { page, perPage, sort };

  Model.findAndPaginate(filter, options, (err, result) => {
    const { docs, totalPages } = result;
    expect(docsToArray(docs)).toEqual(expected);
    expect(totalPages).toBe(4);
    done();
  });
});

it('callback and chaining methods', (done) => {
  const skip = 1;
  const limit = 2;

  const expected = dataSet.filter(d => d.order <= 10)
    .reverse()
    .map(({ name }) => ({ name }))
    .slice(skip, skip + limit);

  const filter = { order: { $lte: 10 } };
  const sort = { order: -1, _id: 1 };

  const query = Model
    .findAndPaginate(filter, { skip, limit, sort })
    .select('name');

  query.exec((err, result) => {
    const { docs, totalDocs } = result;
    expect(docsToArray(docs)).toEqual(expected);
    expect(totalDocs).toBe(10);
    done();
  });
});
