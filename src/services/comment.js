export async function getVideoComments(videoId, page, limit) {
  // TODO: implement
}

export async function getVideoCommentsWithLikeStatus(videoId, userId, page, limit) {
  // TODO: implement
}

export async function addComment(userId, videoId, content) {
  // TODO: implement
}

export async function getCommentReplies(commentId, page, limit) {
  // TODO: implement
}

export async function replyToComment(userId, commentId, content) {
  // TODO: implement
}

export async function editComment(userId, commentId, content) {
  // TODO: implement
}

export async function deleteComment(userId, commentId) {
  // TODO: implement — returns { deleted, videoId, parentId }
}

export async function likeComment(userId, commentId) {
  // TODO: implement
}

export async function unlikeComment(userId, commentId) {
  // TODO: implement
}
