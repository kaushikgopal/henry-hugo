document.addEventListener("DOMContentLoaded", () => {
  const commentsSection = document.getElementById("comments-bsky");
  const bskyWebUrl = commentsSection?.getAttribute("data-bsky-uri");

  if (!bskyWebUrl) return;

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
  const postLink = document.getElementById("post-link");
  const replyLink = document.getElementById("reply-link");
  const commentsContainer = document.getElementById("comments-container");

  likeCountEl.textContent = thread.post.likeCount ?? 0;
  repostCountEl.textContent = thread.post.repostCount ?? 0;
  replyCountEl.textContent = thread.post.replyCount ?? 0;

  const postUrl = `https://bsky.app/profile/${
    thread.post.author.did
  }/post/${thread.post.uri.split("/").pop()}`;
  postLink.href = postUrl;
  replyLink.href = postUrl;

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

  const commentDiv = document.createElement("div");
  commentDiv.className = "comment";

  const authorDiv = document.createElement("div");
  authorDiv.className = "author flex items-center space-x-2";

  if (author.avatar) {
    const avatarImg = document.createElement("img");
    avatarImg.src = author.avatar;
    avatarImg.alt = "avatar";
    avatarImg.className =
      "avatar w-[32px] border border-henryc rounded-full overflow-hidden";
    authorDiv.appendChild(avatarImg);
  }

  const authorLink = document.createElement("a");
  authorLink.href = `https://bsky.app/profile/${author.did}`;
  authorLink.target = "_blank";
  authorLink.textContent = author.displayName ?? author.handle;
  authorDiv.appendChild(authorLink);

  // const handleSpan = document.createElement("span");
  // handleSpan.textContent = `@${author.handle}`;
  // authorDiv.appendChild(handleSpan);

  commentDiv.appendChild(authorDiv);

  const contentP = document.createElement("p");
  contentP.textContent = post.record.text;
  contentP.className = "ml-10 text-henryt-light";
  commentDiv.appendChild(contentP);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "actions ml-10 text-henryt-lighter text-sm";
  actionsDiv.textContent = `${post.replyCount ?? 0} replies | ${
    post.repostCount ?? 0
  } reposts | ${post.likeCount ?? 0} likes`;
  commentDiv.appendChild(actionsDiv);

  if (comment.replies && comment.replies.length > 0) {
    const nestedRepliesDiv = document.createElement("div");
    nestedRepliesDiv.className =
      "nested-replies ml-10 my-4 pl-4 py-2 border-l border-henryt-lighter";

    const sortedReplies = comment.replies.sort(sortByLikes);
    for (const reply of sortedReplies) {
      if (isThreadViewPost(reply)) {
        nestedRepliesDiv.appendChild(renderComment(reply));
      }
    }

    commentDiv.appendChild(nestedRepliesDiv);
  }

  return commentDiv;
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
