var should = require('should'),
    sinon = require('sinon'),
    testEnv = require('./utils').testEnv;

describe('controllers.UserController', function () {
    var UserService, UserController, ctrl, users = [];

    beforeEach(function (done) {
        testEnv(function (_UserService_, _UserController_) {
            UserService = _UserService_;
            UserController = _UserController_;
            UserController.prototype.fakeAction = function () {};

            var req = {
                params: {},
                method: 'GET',
                query: {}
            };
            var res = {
                json: function () {}
            };
            var next = function () {};
            ctrl = new UserController('fakeAction', req, res, next);

            UserService.create({
                firstName: 'Joe',
                username: 'joe@example.com',
                email: 'joe@example.com',
                password: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220'
            })
            .then(function (user) {
                users.push(user); 
                return UserService.create({
                    firstName: 'Rachel',
                    username: 'rachel@example.com',
                    email: 'rachel@example.com',
                    password: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220'
                });
            })
            .then(function (user) {
                users.push(user); 
                done();
            })
            .fail(done);
        });
    });

    afterEach(function () {
        UserService.constructor.instance = null;
    });

    describe('static members', function () {
        describe('.requiresLogin(req, res, next)', function () {
            it('should call next if req.isAuthenticated() returns true', function () {
                var req = {
                        isAuthenticated: function () {
                            return true;
                        }
                    },
                    res = {},
                    next = sinon.spy();
                UserController.requiresLogin(req, res, next);
                next.called.should.be.true;
            });

            it('should send 401 if req.isAuthenticated() returns false', function () {
                var req = {
                        isAuthenticated: function () {
                            return false;
                        }
                    },
                    res = {
                        send: sinon.spy()
                    },
                    next = function () {};
                UserController.requiresLogin(req, res, next);
                res.send.calledWith(401).should.be.true;
            });
        });

        describe('.requiresRole(roleName) -> function(req, res, next)', function () {
            it('should call next() if req.session.user has specified role', function () {
                var req = {
                        isAuthenticated: function () {
                            return true;
                        },
                        session: {
                            user: {
                                roles: ['Trainer']
                            }
                        }
                    },
                    res = {},
                    next = sinon.spy();
                UserController.requiresRole('Trainer')(req, res, next);
                next.called.should.be.true;
            });

            it('should call send(401) if user hasnt specified role', function () {
                var req = {
                        isAuthenticated: function () {
                            return true;
                        },
                        session: {
                            user: {
                                roles: ['Client']
                            }
                        }
                    },
                    res = {
                        send: sinon.spy()
                    },
                    next = function () {};
                UserController.requiresRole('Trainer')(req, res, next);
                res.send.calledWith(401).should.be.true;
            });
        });
    });

    describe('.postAction()', function () {
        it('should hash password and save user', function (done) {
            ctrl.send = function (result) {
                UserService.findAll()
                .then(function (users) {
                    users.should.have.length(3);
                    users[2].password.should.equal('2394a9661a9089208c1c9c65ccac85a91da6a859');
                    done();
                })
                .fail(done);
            };

            ctrl.req.body = {
                username: 'admin',
                email: 'admin@example.com',
                password: 'secret_password'
            };
            ctrl.postAction();
        });

        it('should call .send() with new user', function (done) {
            ctrl.send = function (result) {
                console.log(result);
                result.username.should.equal('admin');
                result.id.should.be.ok;
                result.password.should.equal('2394a9661a9089208c1c9c65ccac85a91da6a859');
                done();
            };
            ctrl.req.body = {
                username: 'admin',
                email: 'admin@example.com',
                password: 'secret_password'
            };
            ctrl.postAction();
        });
    });

    describe.skip('.putAction()', function () {
        it('should hash password and update user', function (done) {
            ctrl.send = function (result) {
                UserService.findById(users[0].id)
                .then(function (user) {
                    user.username.should.equal('admin');
                    user.email.should.equal('admin@example.com');
                    user.password.should.equal('2394a9661a9089208c1c9c65ccac85a91da6a859');
                    done();
                })
                .fail(done);
            };

            ctrl.req.body = {
                username: 'admin',
                email: 'admin@example.com',
                password: 'secret_password'
            };
            ctrl.req.params.id = users[0].id;
            ctrl.putAction();
        });

        it('should call .send() with updated user data', function (done) {
            ctrl.send = function (result) {
                result.username.should.equal('admin');
                result.email.should.equal('admin@example.com');
                result.password.should.equal('2394a9661a9089208c1c9c65ccac85a91da6a859');
                result.id.should.be.ok;
                done();
            };
            ctrl.req.body = {
                username: 'admin',
                email: 'admin@example.com',
                password: 'secret_password'
            };
            ctrl.req.params.id = users[0].id;
            ctrl.putAction();
        });
    });

    describe('.loginAction()', function () {
        it('should call req.login(user) if user with such credentials found', function (done) {
            ctrl.req.login = function (user) {
                user.id.should.eql(users[0].id);
                done();
            };
            ctrl.req.body = {
                username: users[0].username,
                password: '1234'
            };
            ctrl.loginAction();
        });

        it('should call .send(200) if user if such credentials found', function (done) {
            ctrl.req.login = function () {};
            ctrl.res.send = function (code) {
                code.should.equal(200);
                done();
            };
            ctrl.req.body = {
                username: users[0].username,
                password: '1234'
            };
            ctrl.loginAction();
        });

        it('should call .send(403) if user is not found', function (done) {
            ctrl.res.send = function (code) {
                code.should.equal(403);
                done();
            };
            ctrl.req.body = {
                username: users[0].username,
                password: '12345'
            };
            ctrl.loginAction();
        });
    });

    describe('.logoutAction()', function () {
        it('should call req.logout() and .send(200)', function () {
            ctrl.req.logout = sinon.spy();
            ctrl.res.send = sinon.spy();
            ctrl.logoutAction();

            ctrl.req.logout.called.should.be.true;
            ctrl.res.send.calledWith(200).should.be.true;
        });
    });
});
