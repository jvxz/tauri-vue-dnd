export default defineEventHandler(async () => {
  return `Your number was ${(Math.random() * 100).toFixed(2)}`
})
