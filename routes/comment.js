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

const comments = db._collection('forum_comments');
const topics = db._collection('forum_topics');
const forums = db._collection('forums');

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();

router
  .post('/', function (req, res) {
    if (!hasRole(req, 'forum_comments_create')) {
      res.throw(401, `Unathorized`);
    }
    const { createdDate, forum, rating, text, topic, userId } = req.body;

    comments.save({
      createdDate,
      forum,
      rating,
      text,
      topic,
      userId
    });
    res.status(200, `CommentCreated`);
  })
  .body(
    joi
      .object({
        createdDate: joi.string().required(),
        forum: joi.string().required(),
        rating: joi.object(),
        text: joi.string().required(),
        topic: joi.string().required(),
        userId: joi.string().required()
      })
      .required()
  );

router
  .put('/:_key', function (req, res) {
    if (!hasRole(req, 'forum_comments_update')) {
      res.throw(401, `Unathorized`);
    }
    const { text, updatedDate } = req.body;

    const { _key } = req.pathParams;

    if (comments.firstExample({ _key })) {
      comments.update(_key, {
        text,
        updatedDate
      });
      res.status(200, `Comment Updated`);
    } else {
      res.throw(400, `Invalid Comment Id: ${_key}`);
    }
  })
  .body(
    joi
      .object({
        text: joi.string().required(),
        updatedDate: joi.string()
      })
      .required()
  )
  .pathParam('_key');

router
  .delete('/:_key', function (req, res) {
    if (!hasRole(req, 'forum_comments_delete')) {
      res.throw(401, `Unathorized`);
    }

    const { _key } = req.pathParams;
    let comment;

    try {
      comment = db._query(aql`
        FOR comment IN ${comments}
          FILTER comment._key == ${_key}
          REMOVE comment in ${comments}
      `);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    res.status(200, `Comment Deleted`);
  })
  .pathParam('_key')
  .summary('Delete a comment').description(dd`
  Deletes a comment
`);

router
  .get(
    ':_key',
    function (req, res) {
      if (!hasRole(req, 'forum_comments_view')) {
        res.throw(401, `Unathorized`);
      }
      const _key = req.pathParams._key;
      let comment;
      try {
        comment = comments.document(_key);
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
  .pathParam('_key')
  .summary('Fetch a comment').description(dd`
  Retrieves a comment
`);

module.exports = router;
