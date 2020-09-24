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
const topics = db._collection('forum_topics');

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();

router.get(
  '/view/topic/:topicId',
  function (req, res) {
    if (!hasRole(req, 'forum_topics_view')) {
      res.throw(401, `Unathorized`);
    }
    const { topicId } = req.pathParams;

    let topic;

    try {
      topic = topics.firstExample({ _key: topicId });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    let views = ++topic.views;

    try {
      topics.update(topicId, {
        views
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }
    res.send({ response: 'Updated views' });
  },
  'detail'
);

router.get(
  '/new-topic/forum/:forumId',
  function (req, res) {
    if (!hasRole(req, 'forum_topics_create')) {
      res.throw(401, `Unathorized`);
    }
    const { forumId } = req.pathParams;

    let forum;

    try {
      forum = forums.firstExample({ _key: forumId });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    const topics = ++forum.topics;

    try {
      forums.update(forumId, {
        topics
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    res.send({ response: 'Updated Topic Counter' });
  },
  'detail'
);

router.get(
  '/delete-topic/forum/:forumId',
  function (req, res) {
    if (!hasRole(req, 'forum_topics_delete')) {
      res.throw(401, `Unathorized`);
    }

    const replies =
      req.queryParams && req.queryParams.replies
        ? req.queryParams.replies
        : null;

    const { forumId } = req.pathParams;

    let forum;

    try {
      forum = forums.firstExample({ _key: forumId });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    const topics = --forum.topics;

    try {
      forums.update(forumId, {
        topics
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    if (replies) {
      if (forum.replies >= replies) {
        try {
          forums.update(forumId, {
            replies: forum.replies - replies
          });
        } catch (e) {
          if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
            throw httpError(HTTP_NOT_FOUND, e.message);
          }
          throw e;
        }
      }
    }
    res.send({ response: 'Updated Topics and Replies Counter' });
  },
  'detail'
);

router.get(
  '/new-comment/topic/:topicId',
  function (req, res) {
    if (!hasRole(req, 'forum_comments_create')) {
      res.throw(401, `Unathorized`);
    }
    const { topicId } = req.pathParams;

    let topic;

    try {
      topic = topics.firstExample({ _key: topicId });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    const topicReplies = ++topic.replies;

    try {
      topics.update(topicId, {
        replies: topicReplies
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    let forum;

    try {
      forum = forums.firstExample({ _key: topic.forum });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    const forumReplies = ++forum.replies;

    try {
      forums.update(topic.forum, {
        replies: forumReplies
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    res.send({ response: 'Updated Comment Counter' });
  },
  'detail'
);

router.get(
  '/delete-comment/topic/:topicId',
  function (req, res) {
    if (!hasRole(req, 'forum_comments_delete')) {
      res.throw(401, `Unathorized`);
    }
    const { topicId } = req.pathParams;

    let topic;

    try {
      topic = topics.firstExample({ _key: topicId });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    const topicReplies = --topic.replies;

    try {
      topics.update(topicId, {
        replies: topicReplies
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    let forum;

    try {
      forum = forums.firstExample({ _key: topic.forum });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    const forumReplies = --forum.replies;

    try {
      forums.update(topic.forum, {
        replies: forumReplies
      });
    } catch (e) {
      if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
        throw httpError(HTTP_NOT_FOUND, e.message);
      }
      throw e;
    }

    res.send({ response: 'Updated Comment Counter' });
  },
  'detail'
);

module.exports = router;
