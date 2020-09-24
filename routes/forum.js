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
const forums = db._collection('forums');
const topics = db._collection('forum_topics');
const users = db._collection('users');

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();

router.get(
  '/name/:name',
  function (req, res) {
    if (!hasRole(req, 'forums_view')) {
      res.throw(401, `Unathorized`);
    }
    const { name } = req.pathParams;

    let forum;
    try {
      forum = forums.firstExample({ name });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }
    res.send(forum);
  },
  'detail'
);

router.get(
  '/name/:name/topics',
  function (req, res) {
    if (!hasRole(req, 'forum_topics_view')) {
      res.throw(401, `Unathorized`);
    }
    const { name } = req.pathParams;
    let forum;

    try {
      forum = forums.firstExample({ name });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    let topic;
    try {
      topic = db._query(aql`        
        FOR topic IN ${topics}
          FILTER topic.forum == ${forum._key}
          FOR user IN ${users}
            FILTER user._key == topic.userId
            SORT topic.createdDate DESC
            RETURN {
              "_key" : topic._key,
              "created" : topic.createdDate,
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
            }
      `);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }
    res.send(topic);
  },
  'detail'
);

router.get(
  '/id/:_key/topics',
  function (req, res) {
    if (!hasRole(req, 'forum_topics_view')) {
      res.throw(401, `Unathorized`);
    }
    const { _key } = req.pathParams;
    let topic;
    try {
      topic = db._query(aql`
        FOR topic IN ${topics}
          FILTER topic.forum == ${_key}
            FOR user IN ${users}
            FILTER user._key == topic.userId
            SORT topic.createdDate DESC
            RETURN {
              "_key" : topic._key,
              "created" : topic.createdDate,
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
);

router.get(
  '/latest/topics',
  function (req, res) {
    if (!hasRole(req, 'forum_topics_view')) {
      res.throw(401, `Unathorized`);
    }
    const { _key } = req.pathParams;
    let topic;
    try {
      topic = db._query(aql`
        FOR topic IN ${topics}
          FOR forum in ${forums}
            FILTER topic.forum == forum._key
          FOR user IN ${users}
            FILTER user._key == topic.userId
          LIMIT 20
          SORT topic.createdDate DESC, topic.updatedDate DESC
          RETURN {
            "_key" : topic._key,
            "created" : topic.createdDate,
            "forum" : forum,
            "rating" : topic.rating,
            "replies" : topic.replies,
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
);

router
  .post('/', function (req, res) {
    if (!hasRole(req, 'forums_create')) {
      res.throw(401, `Unathorized`);
    }
    const {
      description,
      icon,
      name,
      options,
      parent,
      replies,
      title,
      topics
    } = req.body;

    forums.save({
      description,
      icon,
      name,
      options,
      parent,
      replies,
      title,
      topics
    });
    res.status(200, `Forum Created`);
  })
  .body(
    joi
      .object({
        description: joi.any(),
        icon: joi.string().required(),
        name: joi.string().required(),
        options: joi.object().required(),
        parent: joi.any().required(),
        replies: joi.number().required(),
        title: joi.string().required(),
        topics: joi.number().required()
      })
      .required()
  );

router
  .put('/:_key', function (req, res) {
    if (!hasRole(req, 'forums_update')) {
      res.throw(401, `Unathorized`);
    }
    const {
      description,
      icon,
      name,
      options,
      parent,
      replies,
      title,
      topics
    } = req.body;

    const { _key } = req.pathParams;

    if (forums.firstExample({ _key })) {
      forums.update(_key, {
        description,
        icon,
        name,
        options,
        parent,
        replies,
        title,
        topics
      });
      res.status(200, `Forum Updated`);
    } else {
      res.throw(400, `Invalid Forum Id: ${_key}`);
    }
  })
  .body(
    joi
      .object({
        description: joi.any(),
        icon: joi.string().required(),
        name: joi.string().required(),
        options: joi.object().required(),
        parent: joi.any().required(),
        replies: joi.number().required(),
        title: joi.string().required(),
        topics: joi.number().required()
      })
      .required()
  )
  .pathParam('_key');

router
  .delete('/:_key', function (req, res) {
    if (!hasRole(req, 'forums_delete')) {
      res.throw(401, `Unathorized`);
    }

    const { _key } = req.pathParams;
    let forum;
    let topic;
    let comment;

    try {
      forum = db._query(aql`
        FOR forum IN ${forums}
          FILTER forum._key == ${_key}
          REMOVE forum in ${forums}
      `);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    try {
      topic = db._query(aql`
        FOR topic IN ${topics}
          FILTER topic.forum == ${_key}
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
          FILTER comment.forum == ${_key}
          REMOVE comment in ${comments}
      `);
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    res.status(200, `Forum Deleted`);
  })
  .pathParam('_key')
  .summary('Delete a forum').description(dd`
  Deletes a forum
`);

router
  .get(
    ':_key',
    function (req, res) {
      if (!hasRole(req, 'forums_view')) {
        res.throw(401, `Unathorized`);
      }
      const _key = req.pathParams._key;
      let forum;
      try {
        forum = forums.document(_key);
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
  .summary('Fetch a forum').description(dd`
  Retrieves a forum.
`);

module.exports = router;
