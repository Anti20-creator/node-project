const assert = require('assert')
const request = require('supertest')
const User = require('../models/UserModel')

module.exports = userRouterTests = (app) => {
    describe('User router tests', () => {

        test('Registering one admin', async() => {
            await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók",
                password: "123456",
                email: "owner@gmail.com",
                restaurantName: "Anti Co."
            }).then((result) => {
                assert.equal(result.body.success, true)
            })

            const users = await User.countDocuments({}).exec();
            assert.equal(users, 1)
        })
    })
}