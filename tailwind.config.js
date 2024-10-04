/* allows us to reference tailwind's colors in our own palette
 https://tailwindcss.com/docs/customizing-colors
*/
const colors = require('tailwindcss/colors')

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
                "henryb": { // henry background
                    DEFAULT: "#1c2b33",
                    dark: "#152027",
                },
                'henryc': { // henry contrast
                    lightest: colors.yellow[100],
                    lighter: colors.yellow[200],
                    DEFAULT: colors.yellow[300],
                    dark: colors.yellow[500],
                },
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            console.log('Tailwind CSS root directory:', process.cwd());
        },
    ],
}

