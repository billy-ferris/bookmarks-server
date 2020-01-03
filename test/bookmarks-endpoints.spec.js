const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

describe.only('Bookmarks Endpoints', function() {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('cleanup', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    describe('GET /bookmarks', () => {
        context('Given no data', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })
        })
    })

    describe('GET /bookmarks:id', () => {
        context('Given no data', () => {
            it('responds with a 404', () => {
                const bookmarkId = 123456
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: `Bookmark Not Found` }
                    })
            })
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks/:id responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })
    })

    describe.only('POST /bookmarks', () => {
        it(`responds with 400 missing 'title' if not supplied`, () => {
            const newBookmarkMissingTitle = {
                // title: 'new bookmark test',
                url: 'http://test.com',
                rating: '5',
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmarkMissingTitle)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'title' is required` }
                })
        })

        it(`responds with 400 missing 'url' if not supplied`, () => {
            const newBookmarkMissingUrl = {
                title: 'new bookmark test',
                // url: 'http://test.com',
                rating: '5',
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmarkMissingUrl)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'url' is required` }
                })
        })

        it(`responds with 400 missing 'rating' if not supplied`, () => {
            const newBookmarkMissingRating = {
                title: 'new bookmark test',
                url: 'http://test.com',
                // rating: '5',
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmarkMissingRating)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'rating' is required` }
                })
        })

        it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
            const newBookmarkMissingRating = {
                title: 'new bookmark test',
                url: 'http://test.com',
                rating: 'invalid',
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmarkMissingRating)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'rating' must be a number between 0 and 5` }
                })
        })

        it(`responds with 400 invalid 'url' if not a valid URL`, () => {
            const newBookmarkInvalidUrl = {
                title: 'new bookmark test',
                url: 'htp://test.com',
                rating: '5',
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmarkInvalidUrl)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: `'url' must be a valid URL` }
                })
        })

        it('creates a bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'new bookmark test',
                url: 'http://test.com',
                rating: '5',
                description: 'new bookmark description test...'
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)    
                )
        })
    })
})