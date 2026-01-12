---
draft: true
date: '{{ .Date }}'
# T09:00:00+00:00 this corresponds to 5am EST in NY
slug: '{{ replaceRE "^\\d{4}-\\d{2}-\\d{2}-" "" .File.ContentBaseName }}'
# url: "/episodes/257/"
# slug: "/257/"
title: '{{ replace (replaceRE "^\\d{4}-\\d{2}-\\d{2}-" "" .File.ContentBaseName) "-" " " | title }}'
#timeless: true # pages that don't need a date
#frontpage: true # pages you want stuck on frontpage
# summary: "Mini desc. used in twitter & SEO"
# tags:
#   - tag1
#   - tag2
# externalLink: "https://daring-fireball-style"
# canonicalUrl: "https://when-posted-first-on-medium"
# banner: "/images/content/tw-xxx.png|kau.sh.webp"
# featured_image: /images/branding/banner-3000x1000-dark.webp
# aliases:
#   - /blog/old-url/
#   - /short-url/
# bsky: "https://bsky.app/profile/fragmentedpodcast.com/post/3ljjtfdcstk26"
# hn: https://news.ycombinator.com/item?id=34757898
# reddit: https://www.reddit.com/r/firefox/comments/1m4grz4/how_to_firefox/
---
