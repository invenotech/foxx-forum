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
const users = db._collection('users');

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();

router
  .get(
    '/:topic/comments',
    function (req, res) {
      if (!hasRole(req, 'forum_comments_view')) {
        res.throw(401, `Unathorized`);
      }
      const { topic } = req.pathParams;
      let comment;

      try {
        comment = db._query(aql`
        FOR comment IN ${comments}
          FILTER comment.topic == ${topic}
            FOR user IN ${users}
              FILTER user._key == comment.userId
          SORT comment.createdDate ASC
          RETURN {
            "_key" : comment._key,
            "created" : comment.createdDate,
            "email" : user.email,
            "forum" : comment.forum,
            "rating" : comment.rating,
            "text" : comment.text,
            "topic" : comment.topic,
            "updated" : comment.updatedDate,
            "user" : user,
            "userId" : comment.userId
          }`);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
          throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
      }
      res.send(comment);
    },
    'detail'
  )
  .pathParam('topic')
  .summary('Fetch topic comments').description(dd`
  Retrieves comments for a topic
`);

router
  .post('/', function (req, res) {
    if (!hasRole(req, 'forum_topics_create')) {
      res.throw(401, `Unathorized`);
    }
    const {
      createdDate,
      forum,
      options,
      rating,
      replies,
      text,
      title,
      userId,
      views
    } = req.body;

    topics.save({
      createdDate,
      forum,
      options,
      rating,
      replies,
      text,
      title,
      userId,
      views
    });
    res.status(200, `Topic Created`);
  })
  .body(
    joi
      .object({
        createdDate: joi.string().required(),
        forum: joi.string().required(),
        options: joi.object().required(),
        rating: joi.object(),
        replies: joi.number(),
        text: joi.string().required(),
        title: joi.string().required(),
        userId: joi.string().required(),
        views: joi.number()
      })
      .required()
  )
  .summary('Create a topic').description(dd`
  Creates a topic
`);

router
  .put('/:_key', function (req, res) {
    if (!hasRole(req, 'forum_topics_update')) {
      res.throw(401, `Unathorized`);
    }
    const { options, text, title, updatedDate } = req.body;

    const { _key } = req.pathParams;

    if (topics.firstExample({ _key })) {
      topics.update(_key, {
        options,
        text,
        title,
        updatedDate
      });
      res.status(200, `Topic Updated`);
    } else {
      res.throw(400, `Invalid Topic Id: ${_key}`);
    }
  })
  .body(
    joi
      .object({
        options: joi.object().required(),
        text: joi.string().required(),
        title: joi.string().required(),
        updatedDate: joi.string().required()
      })
      .required()
  )
  .pathParam('_key')
  .summary('Update a topic').description(dd`
  Updates a topic
`);

router
  .delete('/:_key', function (req, res) {
    if (!hasRole(req, 'forum_topics_delete')) {
      res.throw(401, `Unathorized`);
    }

    const { _key } = req.pathParams;
    let topic;
    let comment;

    try {
      topic = db._query(aql`
        FOR topic IN ${topics}
          FILTER topic._key == ${_key}
          REMOVE topic in ${topics}
      `);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    try {
      comment = db._query(aql`
        FOR comment IN ${comments}
          FILTER comment.topic == ${_key}
          REMOVE comment in ${comments}
      `);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    res.status(200, `Topic Deleted`);
  })
  .pathParam('_key')
  .summary('Delete a topic').description(dd`
  Deletes a topic
`);

router
  .get(
    '/:_key',
    function (req, res) {
      if (!hasRole(req, 'forum_topics_view')) {
        res.throw(401, `Unathorized`);
      }
      const { _key } = req.pathParams;
      let topic;
      try {
        topic = db._query(aql`
        FOR topic IN ${topics}
          FILTER topic._key == ${_key}
            FOR user IN ${users}
              FILTER user._key == topic.userId
            SORT topic.date DESC
            RETURN {
              "_key" : topic._key,
              "created" : topic.createdDate,
              "email" : user.email,
              "forum" : topic.forum,
              "options" : topic.options,
              "rating" : topic.rating,
              "replies" : topic.replies,
              "text" : topic.text,
              "title" : topic.title,
              "updated" : topic.updatedDate,
              "user" : user, 
              "userId" : topic.userId,
              "views" : topic.views
            }`);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
          throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
      }
      res.send(topic);
    },
    'detail'
  )
  .pathParam('_key')
  .summary('Fetch a topic').description(dd`
  Retrieves a topic
`);

module.exports = router;
