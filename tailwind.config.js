/** @type {import('tailwindcss').Config} */
module.exports = {
    /* Content sources to tell Tailwind which files to scan for used class names for
         generating the needed CSS. More info:
         - https://tailwindcss.com/docs/content-configuration#configuring-source-paths
      */
    content: [
        "../../content/**/*.{html,md}",
        "../../layouts/**/*.html",
        "./layouts/**/*.html",
        "./assets/js/fuse-search.js",
    ],
    theme: {
        fontFamily: {
            'sans': ['kg-sans'],
            'serif': ['kg-serif'],
            'mono': ['kg-mono'],
        },
        extend: {
            fontFamily: {
                'mono': [
                    'kg-mono',
                    {
                        fontFeatureSettings: '"cv02", "cv04", "cv06", "cv07", "cv08"',
                    },
                ],
            },
            colors: {
                "henry-0": "#202020",
                "henry-1": "#101010",
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            console.log('Tailwind CSS root directory:', process.cwd());
        },
    ],
}

