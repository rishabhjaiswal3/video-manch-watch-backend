import { ensureAuthenticatedUser } from '../../../utils/authHelpers.js';
import { emitNewComment, emitDeleteComment, emitUpdateComment } from '../../../config/socket.js';
import * as commentService from '../../../services/comment.js';

export async function getVideoComments(req, res) {
  // TODO: implement
}

export async function addComment(req, res) {
  // TODO: implement
}

export async function getCommentReplies(req, res) {
  // TODO: implement
}

export async function replyToComment(req, res) {
  // TODO: implement
}

export async function editComment(req, res) {
  // TODO: implement
}

export async function deleteComment(req, res) {
  // TODO: implement
}

export async function likeComment(req, res) {
  // TODO: implement
}

export async function unlikeComment(req, res) {
  // TODO: implement
}
