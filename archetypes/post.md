---
draft: true
date: '{{ .Date }}'
slug: '{{ replaceRE "^\\d{4}-\\d{2}-\\d{2}-" "" .File.ContentBaseName }}'
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
# aliases:
#   - /blog/old-url/
#   - /short-url/
# bsky:
---
