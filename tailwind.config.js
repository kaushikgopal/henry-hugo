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
                    DEFAULT: "#FFFFFF",             // spacey background white
                    dark: "#212121",                // bold black
                },
                'henryc': { // henry contrast
                    lightest: colors.yellow[100],
                    lighter: "#A9EFC8",
                    DEFAULT: "#3DDC84",             // android/fragmented green
                    dark: "#105C2F",
                },
                'henryc2': { // henry contrast 2
                    light: colors.purple[200],
                    DEFAULT: "#E980FC",             // contrasting magenta
                    dark: colors.purple[700],
                },
                'henryt': { // henry text colors
                    lightest: "#e0e0e0",        // prev - slate-50  // muted underline/decoration
                    lighter: "#C2C2C2",         // prev - slate-700 // muted links like author
                    light: "#858585",           // prev - slate-500 // underline/decoration
                    DEFAULT: "#212121",         // prev - slate-300
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

