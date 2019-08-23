export default (schema) => {
  const getPaginationParams = (options) => {
    const {
      skip,
      offset,
      limit,
      page,
      perPage = 0,
      sort
    } = options;

    const calculatedLimit = page ? perPage : limit;
    if (!calculatedLimit) {
      return { sort };
    }

    const calculatedSkip = page
      ? (page * perPage) - perPage
      : skip || offset;

    return {
      sort: sort || '_id',
      limit: calculatedLimit,
      skip: calculatedSkip
    };
  };

  function findAndPaginate(conditions, options, callback) {
    const Model = this;

    const opts = options || {};
    const { limit, skip, sort } = getPaginationParams(opts);
    const query = Model.find(conditions, null, {
      ...opts,
      limit,
      skip,
      sort
    });

    const originalExec = query.exec.bind(query);
    const countQuery = Model.find(conditions).countDocuments();

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

  schema.static('findAndPaginate', findAndPaginate);
};
