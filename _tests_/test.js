const mongoose = require('mongoose');
const findAndPaginate = require('../src');

let Model;
const dataSet = new Array(12).fill()
  .map((d, index) => {
    const order = index + 1;
    const name = `name${order}`;
    return { name, order };
  });

beforeAll(async () => {
  await mongoose.connect(process.env.DB_MONGO_URI, {
    auth: (process.env.DB_MONGO_USER) ? {
      user: process.env.DB_MONGO_USER,
      password: process.env.DB_MONGO_PASSWORD
    } : null,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  const schema = new mongoose.Schema({
    name: String,
    order: Number
  });

  schema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    /*eslint-disable */
    transform: (doc, ret) => {
      delete ret._id;
      return ret;
    }
    /* eslint-enable */
  });

  schema.plugin(findAndPaginate);
  Model = mongoose.model('Model', schema);

  const promises = dataSet.map(data => new Model(data).save());
  await Promise.all(promises);
});

afterEach(async () => {
  delete mongoose.models.Model;
  await mongoose.connection.dropDatabase();
});

it('async with skip and limit', async () => {
  const skip = 2;
  const limit = 2;

  const filter = { order: { $lte: 10 } };
  const sort = { order: 1, _id: 1 } ;
  const query = Model.findAndPaginate(filter, { skip, limit, sort });
  const { docs = [], docsTotal } = await query;
  const docsJSON = Array.from(docs).map(d => d.toJSON());

  const expected = dataSet.filter(d => d.order <= 10)
    .slice(skip, skip + limit);

  expect(docsJSON).toEqual(expected);
  expect(docsTotal).toBe(10);
});

it('async with page and perPage', async () => {
  const page = 3;
  const perPage = 2;

  const filter = { order: { $lte: 10 } };
  const sort = { order: 1, _id: 1 } ;
  const query = Model.findAndPaginate(filter, { page, perPage, sort });
  const { docs = [], pageTotal } = await query;
  const docsJSON = Array.from(docs).map(d => d.toJSON());

  const expected = dataSet.filter(d => d.order <= 10)
    .slice((page * perPage) - perPage, page * perPage);

  expect(docsJSON).toEqual(expected);
  expect(pageTotal).toBe(5);
});

it('async with chaining query methods', async () => {
  const skip = 1;
  const limit = 2;

  const filter = { order: { $lte: 10 } };
  const sort = { order: -1, _id: 1 } ;
  const query = Model.findAndPaginate(filter, { skip, limit, sort })
    .select('name');
  const { docs = [], docsTotal } = await query;
  const docsJSON = Array.from(docs).map(d => d.toJSON());

  const expected = dataSet.filter(d => d.order <= 10)
    .reverse()
    .map(({ name }) => ({ name }))
    .slice(skip, skip + limit);

  expect(docsJSON).toEqual(expected);
  expect(docsTotal).toBe(10);
});
