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
                "henry-0": "#1c2b33",
                "henry-1": "#152027",
                'henry-2': {
                    lightest: '#fef9c3', // 100
                    lighter: '#fef08a', // 200
                    light: '#fde047', // 300
                    DEFAULT: '#fde047', // yellow-300
                    dark: '#eab308',
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

