module.exports = {
  response: async (request) => {
    const item = request.docs || [];
    return {
      data: item,
      pagination: {
        total: request.totalDocs,
        count: request.limit,
        per_page: request.limit,
        current_page: request.page,
        total_pages: request.totalPages,
        nextPage: request.nextPage ? request.nextPage : 0,
        from: (request.page - 1) * request.limit + 1,
        to:
          request.totalDocs > request.limit
            ? (request.page - 1) * request.limit + request.limit >=
              request.totalDocs
              ? request.totalDocs
              : (request.page - 1) * request.limit + request.limit
            : request.totalDocs,
      },
    };
  },
};
