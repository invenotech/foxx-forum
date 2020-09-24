'use strict';
/**
 * Initial Collection Setup
 */
const { db } = require('@arangodb');

if (!db._collection('forums')) {
  db._createDocumentCollection('forums');
}

if (!db._collection('forum_topics')) {
  db._createDocumentCollection('forum_topics');
}

if (!db._collection('forum_comments')) {
  db._createDocumentCollection('forum_comments');
}

const forums = db._collection('forums');

forums.ensureIndex({
  type: 'hash',
  unique: true,
  fields: ['name']
});

forums.ensureIndex({
  type: 'hash',
  unique: false,
  fields: ['parent']
});

const topics = db._collection('forum_topics');

topics.ensureIndex({
  type: 'hash',
  unique: false,
  fields: ['forum']
});

const hasPrivilege = db._collection('hasPrivilege');
const privileges = db._collection('privileges');
const roles = db._collection('roles');

/**
 * Privileges Setup
 */

const forumsPrivCreate = privileges.save({
  name: 'forums_create',
  description: 'Ability to create Forums'
});

const forumsPrivDelete = privileges.save({
  name: 'forums_delete',
  description: 'Ability to delete Forums'
});

const forumsPrivUpdate = privileges.save({
  name: 'forums_update',
  description: 'Ability to update Forums'
});

const forumsPrivView = privileges.save({
  name: 'forums_view',
  description: 'Ability to view Forums'
});

const topicsPrivCreate = privileges.save({
  name: 'forum_topics_create',
  description: 'Ability to create Forum Topics'
});

const topicsPrivDelete = privileges.save({
  name: 'forum_topics_delete',
  description: 'Ability to delete Forum Topics'
});

const topicsPrivUpdate = privileges.save({
  name: 'forum_topics_update',
  description: 'Ability to update Forum Topics'
});

const topicsPrivView = privileges.save({
  name: 'forum_topics_view',
  description: 'Ability to view Forum Topics'
});

const commentsPrivCreate = privileges.save({
  name: 'forum_comments_create',
  description: 'Ability to create Forum Comments'
});

const commentsPrivDelete = privileges.save({
  name: 'forum_comments_delete',
  description: 'Ability to delete Forum Comments'
});

const commentsPrivUpdate = privileges.save({
  name: 'forum_comments_update',
  description: 'Ability to update Forum Comments'
});

const commentsPrivView = privileges.save({
  name: 'forum_comments_view',
  description: 'Ability to view Forum Comments'
});

const adminRole = roles.firstExample({ name: 'admin' });

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${forumsPrivCreate._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${forumsPrivDelete._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${forumsPrivUpdate._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${forumsPrivView._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${topicsPrivCreate._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${topicsPrivDelete._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${topicsPrivUpdate._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${topicsPrivView._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${commentsPrivCreate._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${commentsPrivDelete._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${commentsPrivUpdate._id}`
});

hasPrivilege.save({
  _to: `${adminRole._id}`,
  _from: `${commentsPrivView._id}`
});

module.exports = true;
