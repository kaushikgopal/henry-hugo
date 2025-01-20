document.addEventListener("DOMContentLoaded", () => {
  const commentsSection = document.getElementById("comments-bsky");
  const bskyWebUrl = commentsSection?.getAttribute("data-bsky-uri");

  if (!bskyWebUrl) {
    console.warn("bluesky web url not found");
    return;
  }

  (async () => {
    try {
      const atUri = await extractAtUri(bskyWebUrl);
      console.log("Extracted AT URI:", atUri);

      const thread = await getPostThread(atUri);

      if (thread && thread.$type === "app.bsky.feed.defs#threadViewPost") {
        renderComments(thread, commentsSection);
      } else {
        commentsSection.textContent = "Error fetching comments.";
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      commentsSection.textContent = "Error loading comments.";
    }
  })();
});

async function extractAtUri(webUrl) {
  try {
    const url = new URL(webUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (
      pathSegments.length < 4 ||
      pathSegments[0] !== "profile" ||
      pathSegments[2] !== "post"
    ) {
      throw new Error("Invalid URL format");
    }

    const handleOrDid = pathSegments[1];
    const postID = pathSegments[3];
    let did = handleOrDid;

    if (!did.startsWith("did:")) {
      const resolveHandleURL = `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(
        handleOrDid
      )}`;
      const res = await fetch(resolveHandleURL);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to resolve handle to DID: ${errorText}`);
      }
      const data = await res.json();
      if (!data.did) {
        throw new Error("DID not found in response");
      }
      did = data.did;
    }

    return `at://${did}/app.bsky.feed.post/${postID}`;
  } catch (error) {
    console.error("Error extracting AT URI:", error);
    throw error;
  }
}

async function getPostThread(atUri) {
  console.log("getPostThread called with atUri:", atUri);
  const params = new URLSearchParams({ uri: atUri });
  const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?${params.toString()}`;

  console.log("API URL:", apiUrl);

  const res = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error:", errorText);
    throw new Error(`Failed to fetch post thread: ${errorText}`);
  }

  const data = await res.json();

  if (
    !data.thread ||
    data.thread.$type !== "app.bsky.feed.defs#threadViewPost"
  ) {
    throw new Error("Could not find thread");
  }

  return data.thread;
}

function renderComments(thread, container) {
  const likeCountEl = document.getElementById("likeCount");
  const repostCountEl = document.getElementById("repostCount");
  const replyCountEl = document.getElementById("replyCount");
  const commentPostLink = document.getElementById("comment-post-meta-reply");
  const commentsContainer = document.getElementById("comments-container");

  likeCountEl.textContent = thread.post.likeCount ?? 0;
  repostCountEl.textContent = thread.post.repostCount ?? 0;
  replyCountEl.textContent = thread.post.replyCount ?? 0;

  const postUrl = `https://bsky.app/profile/${
    thread.post.author.did
  }/post/${thread.post.uri.split("/").pop()}`;
  commentPostLink.href = postUrl;

  commentsContainer.innerHTML = "";
  if (thread.replies && thread.replies.length > 0) {
    const sortedReplies = thread.replies.sort(sortByLikes);
    for (const reply of sortedReplies) {
      if (isThreadViewPost(reply)) {
        commentsContainer.appendChild(renderComment(reply));
      }
    }
  }
}

function renderComment(comment) {
  const { post } = comment;
  const { author } = post;

  const template = document.getElementById("comment-template");
  const commentClone = template.content.cloneNode(true);

  const avatarLink = commentClone.querySelector(".avatar-link");
  const avatarImg = commentClone.querySelector(".avatar-img");
  const authorLink = commentClone.querySelector(".author-link");
  const authorName = commentClone.querySelector(".author-name");
  const commentText = commentClone.querySelector(".comment-text");

  avatarLink.href = `https://bsky.app/profile/${author.did}`;
  authorLink.href = `https://bsky.app/profile/${author.did}`;

  if (author.avatar) {
    avatarImg.src = author.avatar;
    avatarImg.alt = author.displayName ?? author.handle;
    avatarImg.title = author.handle;
  }

  authorName.textContent = author.displayName ?? author.handle;
  authorName.title = author.handle;

  commentText.textContent = post.record.text;

  // actions
  const actionsLink = commentClone.querySelector(".actions-link");
  const commentUrl = `https://bsky.app/profile/${author.did}/post/${post.uri
    .split("/")
    .pop()}`;
  actionsLink.href = commentUrl;
  actionsLink.textContent = `${post.replyCount ?? 0} replies | ${
    post.repostCount ?? 0
  } reposts | ${post.likeCount ?? 0} likes`;

  // Nested replies
  if (comment.replies && comment.replies.length > 0) {
    const sortedReplies = comment.replies.sort(sortByLikes);
    const nestedRepliesContainer = document.createElement("div");
    nestedRepliesContainer.className = "comment nested-replies ml-14";

    for (const reply of sortedReplies) {
      if (isThreadViewPost(reply)) {
        nestedRepliesContainer.appendChild(renderComment(reply));
      }
    }
    commentClone.appendChild(nestedRepliesContainer);
  }

  return commentClone;
}

function sortByLikes(a, b) {
  if (!isThreadViewPost(a) || !isThreadViewPost(b)) {
    return 0;
  }
  return (b.post.likeCount ?? 0) - (a.post.likeCount ?? 0);
}

function isThreadViewPost(obj) {
  return obj && obj.$type === "app.bsky.feed.defs#threadViewPost";
}
