const request = require('supertest')
const server = require('../../app');
// require('dotenv').config();
describe('GET /api/v1/diyvideos', () => {
  it('should return 200 & valid response to authorization with request', async done => {
    request(server)
      .get(`/api/v1/diyvideos`)
      .set('Authorization', `Bearer oPknlnM5kxGF4Fw6DQcW3MYwuRovvQj6SjgpfhyPQDy2ejXAeWH0FxFzhKQpjJo3`)
      .expect('Content-Type', /json/)
      .expect(200)
    //   .end(function(err, res) {
    //     if (err) return done(err)
    //     expect(res.body).toMatchObject({'message': 'Goodbye, fakeUserId!'})
    //     done()
    //   })
  })

//   it('should return 401 & valid eror response to invalid authorization token', async done => {
//     request(server)
//       .get(`/api/v1/diyvideos`)
//       .set('Authorization', 'Bearer invalidFakeToken')
//       .expect('Content-Type', /json/)
//       .expect(401)
//       .end(function(err, res) {
//         if (err) return done(err)
//         expect(res.body).toMatchObject({error: {type: 'unauthorized', message: 'Authentication Failed'}})
//         done()
//       })
//   })

//   it('should return 401 & valid eror response if authorization header field is missed', async done => {
//     request(server)
//       .get(`/api/v1/diyvideos`)
//       .expect('Content-Type', /json/)
//       .expect(401)
//       .end(function(err, res) {
//         if (err) return done(err)
//         expect(res.body).toMatchObject({'error': {
//           type: 'request_validation', 
//           message: 'Authorization header required', 
//           errors: expect.anything()
//         }})
//         done()
//       })
//   })
})