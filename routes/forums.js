'use strict';
const dd = require('dedent');
const joi = require('joi');

const aql = require('@arangodb').aql;
const { db } = require('@arangodb');
const sessions = module.context.dependencies.sessions;
const hasRole = module.context.dependencies.permissions;

module.context.use(sessions);

const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const forums = db._collection('forums');

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();

router
  .get(
    '/id/:_key/children',
    function (req, res) {
      if (!hasRole(req, 'forums_view')) {
        res.throw(401, `Unathorized`);
      }
      const { _key } = req.pathParams;
      let forum;
      try {
        forum = db._query(aql`
          FOR forum IN ${forums}
            FILTER forum.parent == ${_key}
            SORT forum.name
            RETURN {
              "_key" : forum._key,
              "description" : forum.description,
              "icon" : forum.icon,
              "name" : forum.name,
              "options" : forum.options,
              "parent" : forum.parent,
              "replies" : forum.replies,
              "title" : forum.title,
              "topics" : forum.topics
            }`);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
          throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
      }
      res.send(forum);
    },
    'detail'
  )

  .summary('Fetch forums by parent').description(dd`
  Retrieves forums by parent.
`);

router
  .get(
    '/name/:name/children',
    function (req, res) {
      if (!hasRole(req, 'forums_view')) {
        res.throw(401, `Unathorized`);
      }
      const { name } = req.pathParams;
      const parent = forums.firstExample({ name });
      const { _key } = parent;
      let forum;
      try {
        forum = db._query(aql`
      FOR forum IN ${forums}
        FILTER forum.parent == ${_key}
        SORT forum.name
        RETURN {
          "_key" : forum._key,
          "description" : forum.description,
          "icon" : forum.icon,
          "name" : forum.name,
          "options" : forum.options,
          "parent" : forum.parent,
          "replies" : forum.replies,
          "title" : forum.title,
          "topics" : forum.topics
        }`);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
          throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
      }
      res.send(forum);
    },
    'detail'
  )

  .summary('Fetch forums by parent').description(dd`
  Retrieves forums by parent.
`);

router
  .get(
    '/main',
    function (req, res) {
      if (!hasRole(req, 'forums_view')) {
        res.throw(401, `Unathorized`);
      }

      let forum;
      try {
        forum = db._query(aql`
      FOR forum IN ${forums}
        FILTER forum.parent == null
        SORT forum.name
        RETURN {
          "_key" : forum._key,
          "description" : forum.description,
          "icon" : forum.icon,
          "name" : forum.name,
          "options" : forum.options,
          "parent" : forum.parent,
          "replies" : forum.replies,
          "title" : forum.title,
          "topics" : forum.topics
        }`);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
          throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
      }
      res.send(forum);
    },
    'detail'
  )

  .summary('Fetch Top-Level forums').description(dd`
  Retrieves Top-Level forums.
`);

router
  .get(function (req, res) {
    if (!hasRole(req, 'forums_view')) {
      res.throw(401, `Unathorized`);
    }

    let forum;
    try {
      forum = db._query(aql`
      FOR forum IN ${forums}
        SORT forum.name
        RETURN {
          "_key" : forum._key,
          "description" : forum.description,
          "icon" : forum.icon,
          "name" : forum.name,
          "options" : forum.options,
          "parent" : forum.parent,
          "replies" : forum.replies,
          "title" : forum.title,
          "topics" : forum.topics
        }`);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }
    res.send(forum);
  }, 'detail')

  .summary('Fetch all forums').description(dd`
  Retrieves all forums.
`);

module.exports = router;
