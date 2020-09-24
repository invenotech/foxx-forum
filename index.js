'use strict';

module.context.use('/comment', require('./routes/comment'), 'comment');
module.context.use('/forum', require('./routes/forum'), 'forum');
module.context.use('/forum-meta', require('./routes/meta'), 'forum-meta');
module.context.use('/forums', require('./routes/forums'), 'forums');
module.context.use('/topic', require('./routes/topic'), 'topic');
