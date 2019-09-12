const calcPaginationParams = (options) => {
  const {
    skip,
    offset,
    limit,
    page,
    perPage = 0,
    sort
  } = options;

  const calcLimit = page ? perPage : limit;
  const calcSkip = page
    ? (page * perPage) - perPage
    : skip || offset;

  return {
    sort: sort || '_id',
    limit: calcLimit,
    skip: calcSkip
  };
};

/**
 * @function findAndPaginate
 * @param {Object} filter The query filter
 * @param {Object} options The query options
 * @param {Function} callback
 * @return {Promise<findAndPaginateResult>}
 */
/**
 * @typedef {Object} findAndPaginateResult
 * @property {Array} docs
 * @property {number} totalDocs
 * @property {number} totalPages
 */
function findAndPaginate(filter, options, callback) {
  const Model = this;

  const opts = options || {};
  const { limit, skip, sort } = calcPaginationParams(opts);
  const query = Model.find(filter, null, {
    ...opts,
    limit,
    skip,
    sort
  });

  const originalExec = query.exec.bind(query);
  const countQuery = Model.find(filter).countDocuments();

  query.exec = async (cb) => {
    let queryResults;

    try {
      queryResults = await Promise.all([
        originalExec(),
        countQuery
      ]);
    } catch (err) {
      if (cb) {
        cb(err, null);
      } else {
        throw err;
      }
    }

    const [docs, totalDocs] = queryResults;
    const totalPages = limit ? Math.ceil(totalDocs / limit) : 1;
    const result = { docs, totalDocs, totalPages };

    if (cb) {
      cb(null, result);
    }

    return result;
  };

  if (callback) {
    query.exec(callback);
  }

  return query;
}

export default (schema) => {
  schema.static('findAndPaginate', findAndPaginate);
};
