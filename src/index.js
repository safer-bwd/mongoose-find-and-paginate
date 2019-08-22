module.exports = (schema) => {
  function findAndPaginate() {
    const Model = this;
    const query = Model.find();
    return query;
  }

  schema.static('findAndPaginate', findAndPaginate);
};
