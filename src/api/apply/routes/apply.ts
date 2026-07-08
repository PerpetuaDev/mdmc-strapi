export default {
  routes: [
    {
      method: 'POST',
      path: '/apply',
      handler: 'apply.send',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
}
