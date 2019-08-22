export default (schema) => {
  const calculatePagination = (pagination) => {
    const {
      skip,
      offset,
      limit,
      page,
      perPage = 0,
      sort
    } = pagination || {};

    const calculatedLimit = page ? perPage : limit;
    if (!calculatedLimit) {
      return { sort };
    }

    const calculatedSkip = page
      ? (page * perPage) - perPage
      : skip || offset;

    return {
      sort: '_id',
      limit: calculatedLimit,
      skip: calculatedSkip
    };
  };

  function findAndPaginate(conditions, pagination, options, callback) {
    const Model = this;

    const { limit, skip, sort } = calculatePagination(pagination);
    const query = Model.find(conditions, null, {
      ...options,
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
      // TODO: callback
      return { docs, totalDocs, totalPages };
    };

    if (callback) {
      query.exec(callback);
    }

    return query;
  }

  schema.static('findAndPaginate', findAndPaginate);
};
