// ==UserScript==
// @name         TweetWipe (TweetXer Fork)
// @namespace    https://github.com/Falopp/TweetWipe/
// @version      0.11.0
// @description  Elimina tus Tweets de forma lenta con un solo botón. Fork simplificado de TweetXer.
// @author       Falopp (basado en trabajo de Luca Hammer y colaboradores)
// @license      NoHarm-draft
// @match        https://x.com/*
// @match        https://mobile.x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @grant        none
// @downloadURL  https://update.greasyfork.org/scripts/476062/TweetXer.user.js
// @updateURL    https://update.greasyfork.org/scripts/476062/TweetXer.meta.js
// @supportURL   https://github.com/lucahammer/tweetXer/issues
// ==/UserScript==

(function () {
    let TweetsXer = {
        version: '0.11.0',
        TweetCount: 0,
        dId: "exportUpload",
        tIds: [],
        tId: "",
        ratelimitreset: 0,
        more: '[data-testid="tweet"] [data-testid="caret"]',
        skip: 0,
        total: 0,
        dCount: 0,
        deleteURL: '/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet',
        unfavURL: '/i/api/graphql/ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet',
        deleteMessageURL: '/i/api/graphql/BJ6DtxA2llfjnRoRjaiIiw/DMMessageDeleteMutation',
        deleteConvoURL: '/i/api/1.1/dm/conversation/USER_ID-CONVERSATION_ID/delete.json',
        bookmarksURL: '/i/api/graphql/YnSSREbpZZHAaNdnEk4ycA/Bookmarks?',
        deleteDMsOneByOne: false,
        username: '',
        action: '',
        bookmarks: [],
        bookmarksNext: '',
        baseUrl: 'https://x.com',
        authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        ct0: false,
        transaction_id: '',

        async init() {
            this.baseUrl = `https://${window.location.hostname}`
            this.createUploadForm()
            await this.getTweetCount()
            this.ct0 = this.getCookie('ct0')
            this.username = document.location.href.split('/')[3].replace('#', '')
        },

        sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms))
        },

        getCookie(name) {
            const match = `; ${document.cookie}`.match(`;\\s*${name}=([^;]+)`)
            return match ? match[1] : null
        },


        updateTitle(text) {
            document.getElementById('tweetsXer_title').textContent = text
        },

        updateInfo(text) {
            document.getElementById("info").textContent = text
        },

        createProgressBar() {
            const progressbar = document.createElement("progress")
            progressbar.id = "progressbar"
            progressbar.value = this.dCount
            progressbar.max = this.total
            progressbar.style = 'width:100%'

            document.getElementById(this.dId).appendChild(progressbar)
        },

        updateProgressBar() {
            document.getElementById('progressbar').value = this.dCount
            this.updateInfo(`${this.dCount} deleted. ${this.tId}`)
        },

        processFile() {
            const tn = document.getElementById(`${TweetsXer.dId}_file`)
            if (tn.files && tn.files[0]) {
                let fr = new FileReader()
                fr.onloadend = function (evt) {
                    // window.YTD.tweet_headers.part0
                    // window.YTD.tweets.part0
                    // window.YTD.like.part0
                    // window.YTD.direct_message_headers.part0
                    let cutpoint = evt.target.result.indexOf('= ')
                    let filestart = evt.target.result.slice(0, cutpoint)
                    let json = JSON.parse(evt.target.result.slice(cutpoint + 1))

                    if (filestart.includes('.tweet_headers.')) {
                        console.log('File contains Tweets.')
                        TweetsXer.action = 'untweet'
                        TweetsXer.tIds = json.map((x) => x.tweet.tweet_id)
                    } else if (filestart.includes('.tweets.') || filestart.includes('.tweet.')) {
                        console.log('File contains Tweets.')
                        TweetsXer.action = 'untweet'
                        TweetsXer.tIds = json.map((x) => x.tweet.id_str)
                    } else if (filestart.includes('.like.')) {
                        console.log('File contains Favs.')
                        TweetsXer.action = 'unfav'
                        TweetsXer.tIds = json.map((x) => x.like.tweetId)
                    }
                    else if (
                        filestart.includes('.direct_message_headers.')
                        || filestart.includes('.direct_message_group_headers.')
                        || filestart.includes('.direct_messages.')
                        || filestart.includes('.direct_message_groups.')) {
                        console.log('File contains Direct Messages.')
                        TweetsXer.action = 'undm'
                        if (this.deleteDMsOneByOne) {
                            TweetsXer.tIds = json.map((c) => c.dmConversation.messages.map((m) => m.messageCreate ? m.messageCreate.id : 0))
                            TweetsXer.tIds = TweetsXer.tIds.flat()
                            TweetsXer.tIds = TweetsXer.tIds.filter((i) => i != 0)
                        }
                        else {
                            TweetsXer.tIds = json.map((c) => c.dmConversation.conversationId)
                        }

                    } else {
                        TweetsXer.updateInfo('File content not recognized. Please use a file from the Twitter data export.')
                        console.log('File content not recognized. Please use a file from the Twitter data export.')
                    }

                    if (TweetsXer.action.length > 0) {
                        TweetsXer.total = TweetsXer.tIds.length
                        document.getElementById(`${TweetsXer.dId}_file`).remove()
                        TweetsXer.createProgressBar()
                    }

                    if (TweetsXer.action == 'untweet') {
                        if (document.getElementById('skipCount').value.length < 1) {
                            // If there is no amount set to skip, automatically try to skip the amount
                            // that has been deleted already. Difference of Tweeets in file to count on profile
                            // 5% tolerance to prevent skipping too much
                            TweetsXer.skip = TweetsXer.total - TweetsXer.TweetCount - parseInt(TweetsXer.total / 20)
                            TweetsXer.skip = Math.max(0, TweetsXer.skip)
                        }
                        else {
                            TweetsXer.skip = document.getElementById('skipCount').value
                        }
                        console.log(`Skipping oldest ${TweetsXer.skip} Tweets. Use advanced options to manually set how many to skip. Enter 0 to prevent the automatic calculation.`)
                        TweetsXer.tIds.reverse()
                        TweetsXer.tIds = TweetsXer.tIds.slice(TweetsXer.skip)
                        TweetsXer.dCount = TweetsXer.skip
                        TweetsXer.tIds.reverse()
                        TweetsXer.updateTitle(`TweetWipe: Deleting ${TweetsXer.total} Tweets`)

                        TweetsXer.deleteTweets()
                    } else if (TweetsXer.action == 'unfav') {
                        TweetsXer.skip = document.getElementById('skipCount').value.length > 0 ? document.getElementById('skipCount').value : 0
                        console.log(`Skipping oldest ${TweetsXer.skip} Tweets`)
                        TweetsXer.tIds = TweetsXer.tIds.slice(TweetsXer.skip)
                        TweetsXer.dCount = TweetsXer.skip
                        TweetsXer.tIds.reverse()
                        TweetsXer.updateTitle(`TweetWipe: Deleting ${TweetsXer.total} Favs`)
                        TweetsXer.deleteFavs()
                    } else if (TweetsXer.action == 'undm') {
                        TweetsXer.skip = document.getElementById('skipCount').value.length > 0 ? document.getElementById('skipCount').value : 0
                        console.log(`Skipping ${TweetsXer.skip} messages/convos`)
                        TweetsXer.tIds = TweetsXer.tIds.slice(TweetsXer.skip)
                        TweetsXer.dCount = TweetsXer.skip
                        TweetsXer.tIds.reverse()
                        if (this.deleteDMsOneByOne) {
                            TweetsXer.updateTitle(`TweetWipe: Deleting ${TweetsXer.total} DMs`)
                            TweetsXer.deleteDMs()
                        }
                        else {
                            TweetsXer.updateTitle(`TweetWipe: Deleting ${TweetsXer.total} DM Conversations`)
                            TweetsXer.deleteConvos()
                        }

                    }
                    else {
                        TweetsXer.updateTitle(`TweetWipe: Please try a different file`)
                    }

                }
                fr.readAsText(tn.files[0])
            }
        },

        createUploadForm() {
            const h2Class = document.querySelectorAll("h2")[1]?.getAttribute("class") || ""

            // Overlay oscuro
            const overlay = document.createElement("div")
            overlay.id = `${this.dId}_overlay`
            overlay.style = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;`
            document.body.appendChild(overlay)

            // Contenedor popup
            const div = document.createElement("div")
            div.id = this.dId
            if (document.getElementById(this.dId)) {
                document.getElementById(this.dId).remove()
            }
            div.style = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;background:#1d9bf0;border-radius:8px;padding:24px;text-align:center;z-index:99999;color:#fff;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.3);`
            div.innerHTML = `
                <h2 class="${h2Class}" id="tweetsXer_title" style="margin-top:0;color:#fff;">TweetWipe</h2>
                <p id="info" style="margin:0 0 16px;">Cargando tu perfil…</p>
                <div id="start">
                    <button id="deletePosts" style="background:#ff4d4f;border:none;color:#fff;padding:10px 24px;font-size:16px;border-radius:4px;cursor:pointer;margin:4px;">Borrar Tweets</button>
                    <button id="deleteReplies" style="background:#ff9f0a;border:none;color:#fff;padding:10px 24px;font-size:16px;border-radius:4px;cursor:pointer;margin:4px;">Borrar Respuestas</button>
                    <button id="unfollowBtn" style="background:#6366f1;border:none;color:#fff;padding:10px 24px;font-size:16px;border-radius:4px;cursor:pointer;margin:4px;">Borrar Seguidos</button>
                </div>
            `
            document.body.appendChild(div)

            // Acción del botón
            document.getElementById("deletePosts").addEventListener("click", async () => {
                overlay.remove()
                disableButtons()
                await this.slowDelete('posts')
            })
            document.getElementById("deleteReplies").addEventListener("click", async () => {
                overlay.remove()
                disableButtons()
                await this.slowDelete('replies')
            })
            document.getElementById("unfollowBtn").addEventListener("click", async () => {
                overlay.remove()
                disableButtons()
                await this.unfollow()
            })

            function disableButtons(){
                document.querySelectorAll('#start button').forEach(b=>b.disabled=true)
            }
        },

        async exportBookmarks() {
            TweetsXer.updateTitle('TweetWipe: Exporting bookmarks')
            let variables = ''
            while (TweetsXer.bookmarksNext.length > 0 || TweetsXer.bookmarks.length == 0) {
                if (TweetsXer.bookmarksNext.length > 0) {
                    variables = `{"count":20,"cursor":"${TweetsXer.bookmarksNext}","includePromotedContent":false}`
                } else variables = '{"count":20,"includePromotedContent":false}'

                let fetch_url = TweetsXer.baseUrl + TweetsXer.bookmarksURL + new URLSearchParams({
                    variables: variables,
                    features: '{"rweb_video_screen_enabled":false,"profile_label_improvements_pcf_label_in_post_enabled":true,"rweb_tipjar_consumption_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"premium_content_api_read_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"responsive_web_grok_analyze_button_fetch_trends_enabled":false,"responsive_web_grok_analyze_post_followups_enabled":true,"responsive_web_jetfuel_frame":false,"responsive_web_grok_share_attachment_enabled":true,"articles_preview_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"responsive_web_grok_show_grok_translated_post":false,"responsive_web_grok_analysis_button_from_backend":true,"creator_subscriptions_quote_tweet_preview_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_grok_image_annotation_enabled":true,"responsive_web_enhance_cards_enabled":false}'
                })
                let transaction_id = await generateTID(fetch_url)

                let response = await fetch(fetch_url, {
                    "headers": {
                        "authorization": TweetsXer.authorization,
                        "content-type": "application/json",
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-csrf-token": TweetsXer.ct0,
                        "x-twitter-client-language": "en",
                        "x-twitter-active-user": "yes",
                        "x-client-transaction-id": transaction_id,
                        "x-xp-forwarded-for": ''
                    },
                    "referrer": `${TweetsXer.baseUrl}/i/bookmarks`,
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                })

                if (response.status == 200) {
                    let data = await response.json()
                    data.data.bookmark_timeline_v2.timeline.instructions[0].entries.forEach((item) => {

                        if (item.entryId.includes('tweet')) {
                            TweetsXer.dCount++
                            TweetsXer.bookmarks.push(item.content.itemContent.tweet_results.result)
                        } else if (item.entryId.includes('cursor-bottom')) {
                            if (TweetsXer.bookmarksNext != item.content.value) {
                                TweetsXer.bookmarksNext = item.content.value
                            } else {
                                TweetsXer.bookmarksNext = ''
                            }
                        }
                    })
                    //document.getElementById('progressbar').setAttribute('value', TweetsXer.dCount)
                    TweetsXer.updateInfo(`${TweetsXer.dCount} Bookmarks collected`)
                } else {
                    console.log(response)
                    break
                }

                if (!response.headers.get('x-rate-limit-remaining') && response.headers.get('x-rate-limit-remaining') < 1) {
                    console.log('rate limit hit')
                    TweetsXer.ratelimitreset = response.headers.get('x-rate-limit-reset')
                    let sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                    while (sleeptime > 0) {
                        sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                        TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime} seconds. ${TweetsXer.dCount} deleted.`)
                        await TweetsXer.sleep(1000)
                    }
                }
            }
            let download = new Blob([JSON.stringify(TweetsXer.bookmarks)], {
                type: 'text/plain'
            })
            let bookmarksDownload = document.createElement("a")
            bookmarksDownload.id = 'bookmarksDownload'
            bookmarksDownload.innerText = 'Download bookmarks'
            bookmarksDownload.href = window.URL.createObjectURL(download)
            bookmarksDownload.download = 'twitter-bookmarks.json'
            document.getElementById('advanced').appendChild(bookmarksDownload)
            TweetsXer.updateTitle('TweetWipe')
        },

        async sendRequest(
            url,
            body = `{\"variables\":{\"tweet_id\":\"${TweetsXer.tId}\",\"dark_request\":false},\"queryId\":\"${url.split('/')[6]}\"}`
        ) {
            return new Promise(async (resolve) => {
                try {
                    let response = await fetch(url, {
                        "headers": {
                            "authorization": TweetsXer.authorization,
                            "content-type": "application/json",
                            "x-client-transaction-id": TweetsXer.transaction_id,
                            "x-csrf-token": TweetsXer.ct0,
                            "x-twitter-active-user": "yes",
                            "x-twitter-auth-type": "OAuth2Session",
                            "x-client-transaction-id": await generateTID(url),
                            "x-xp-forwarded-for": ''
                        },
                        "referrer": `${TweetsXer.baseUrl}/${TweetsXer.username}/with_replies`,
                        "referrerPolicy": "strict-origin-when-cross-origin",
                        "body": body,
                        "method": "POST",
                        "mode": "cors",
                        "credentials": "include",
                        "signal": AbortSignal.timeout(5000)
                    })


                    if (response.status == 200) {
                        TweetsXer.dCount++
                        TweetsXer.updateProgressBar()

                        if (response.headers.get('x-rate-limit-remaining') != null && response.headers.get('x-rate-limit-remaining') < 1) {
                            console.log('rate limit hit')
                            console.log(response.headers.get('x-rate-limit-remaining'))
                            TweetsXer.ratelimitreset = response.headers.get('x-rate-limit-reset')
                            let sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                            while (sleeptime > 0) {
                                sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                                TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime} seconds. ${TweetsXer.dCount} deleted.`)
                                await TweetsXer.sleep(1000)
                            }
                            resolve('deleted and waiting')
                        }
                        else {
                            resolve('deleted')
                        }


                    }
                    else if (response.status == 429) {
                        TweetsXer.tIds.push(TweetsXer.tId)
                        console.log('Received status code 429. Waiting for 1 second before trying again.')
                        await TweetsXer.sleep(1000)
                    }
                    else {
                        console.log(response)
                    }

                } catch (error) {
                    if (error.Name === 'AbortError') {
                        TweetsXer.tIds.push(TweetsXer.tId)
                        console.log('Request timeout.')
                        let sleeptime = 15
                        while (sleeptime > 0) {
                            sleeptime--
                            TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime} seconds. ${TweetsXer.dCount} deleted.`)
                            await TweetsXer.sleep(1000)
                        }
                        resolve('error')
                    }
                }
            })
        },

        async deleteTweets() {
            while (this.tIds.length > 0) {
                this.tId = this.tIds.pop()
                await this.sendRequest(this.baseUrl + this.deleteURL)
            }
            this.tId = ''
            this.updateProgressBar()
        },

        async deleteFavs() {
            this.updateTitle('TweetWipe: Deleting Favs')
            // 500 unfavs per 15 Minutes
            // x-rate-limit-remaining
            // x-rate-limit-reset

            while (this.tIds.length > 0) {
                this.tId = this.tIds.pop()
                await this.sendRequest(this.baseUrl + this.unfavURL)
            }
            this.tId = ''
            this.updateTitle('TweetWipe')
            this.updateProgressBar()
        },

        async deleteDMs() {
            while (this.tIds.length > 0) {
                this.tId = this.tIds.pop()
                await this.sendRequest(
                    this.baseUrl + this.deleteMessageURL,
                    body = `{\"variables\":{\"messageId\":\"${this.tId}\"},\"requestId\":\""}`
                )
            }
            this.tId = ''
            this.updateProgressBar()
        },

        async deleteConvos() {
            while (this.tIds.length > 0) {
                this.tId = this.tIds.pop()
                url = this.baseUrl + this.deleteConvoURL.replace('USER_ID-CONVERSATION_ID', this.tId)
                let response = await fetch(url, {
                    "headers": {
                        "authorization": TweetsXer.authorization,
                        "content-type": "application/x-www-form-urlencoded",
                        "x-client-transaction-id": TweetsXer.transaction_id,
                        "x-csrf-token": TweetsXer.ct0,
                        "x-twitter-active-user": "yes",
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-client-transaction-id": await generateTID(url),
                        "x-xp-forwarded-for": ''
                    },
                    "referrer": `${TweetsXer.baseUrl}/messages`,
                    "body": 'dm_secret_conversations_enabled=false&krs_registration_enabled=true&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_views=true&dm_users=false&include_groups=true&include_inbox_timelines=true&include_ext_media_color=true&supports_reactions=true&supports_edit=true&include_conversation_info=true',
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "include",
                    "signal": AbortSignal.timeout(5000)
                })


                if (response.status == 204) {
                    TweetsXer.dCount++
                    TweetsXer.updateProgressBar()

                    if (response.headers.get('x-rate-limit-remaining') != null && response.headers.get('x-rate-limit-remaining') < 1) {
                        console.log('rate limit hit')
                        console.log(response.headers.get('x-rate-limit-remaining'))
                        TweetsXer.ratelimitreset = response.headers.get('x-rate-limit-reset')
                        let sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                        while (sleeptime > 0) {
                            sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                            TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime} seconds. ${TweetsXer.dCount} deleted.`)
                            await TweetsXer.sleep(1000)
                        }
                    }
                    await TweetsXer.sleep(Math.floor(Math.random() * 200)) // send requests slightly slower and with random intervals
                }
                else if (response.status == 429 || response.status == 420) {
                    TweetsXer.tIds.push(TweetsXer.tId)
                    console.log(`Received status code ${response.status}. Waiting before trying again.`)
                    let sleeptime = 60 * 5 // is that enough?
                    while (sleeptime > 0) {
                        sleeptime--
                        TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime} seconds. ${TweetsXer.dCount} deleted.`)
                        await TweetsXer.sleep(1000)
                    }

                }
                else {
                    console.log(response)
                }
            }
            this.tId = ''
            this.updateProgressBar()
        },

        async getTweetCount() {
            await waitForElemToExist('header')
            await TweetsXer.sleep(1000)
            if (!document.querySelector('[data-testid="UserName"]')) {
                if (document.querySelector('[aria-label="Back"]')) {
                    await TweetsXer.sleep(200)
                    document.querySelector('[aria-label="Back"]').click()
                    await TweetsXer.sleep(1000)
                }
                else if (document.querySelector('[data-testid="app-bar-back"]')) {
                    document.querySelector('[data-testid="app-bar-back"]').click()
                    await TweetsXer.sleep(1000)
                }

                if (document.querySelector('[data-testid="AppTabBar_Profile_Link"]')) {
                    await TweetsXer.sleep(200)
                    document.querySelector('[data-testid="AppTabBar_Profile_Link"]').click()
                }
                else if (document.querySelector('[data-testid="DashButton_ProfileIcon_Link"]')) {
                    await TweetsXer.sleep(100)
                    document.querySelector('[data-testid="DashButton_ProfileIcon_Link"]').click()
                    await TweetsXer.sleep(1000)
                    document.querySelector('[data-testid="icon"').nextElementSibling.click()
                }

                await waitForElemToExist('[data-testid="UserName"]')
            }
            await TweetsXer.sleep(1000)

            function extractTweetCount(selector) {
                const element = document.querySelector(selector)
                if (!element) return null

                const match = element.textContent.match(/((\d|,|\.|K)+) (\w+)$/)
                if (!match) return null

                return match[1]
                    .replace(/\.(\d+)K/, '$1'.padEnd(4, '0'))
                    .replace('K', '000')
                    .replace(',', '')
                    .replace('.', '')
            }

            try {
                TweetsXer.TweetCount = extractTweetCount('[data-testid="primaryColumn"]>div>div>div')

                if (!TweetsXer.TweetCount) {
                    TweetsXer.TweetCount = extractTweetCount('[data-testid="TopNavBar"]>div>div')
                }

                if (!TweetsXer.TweetCount) {
                    console.log("Wasn't able to find Tweet count on profile. Setting it to 1 million.")
                    TweetsXer.TweetCount = 1000000
                }

            } catch (error) {
                console.log("Wasn't able to find Tweet count on profile. Setting it to 1 million.")
                TweetsXer.TweetCount = 1000000 // prevents Tweets from being skipped because if tweet count of 0

            }
            this.updateInfo('Pulsa "Borrar Tweets" para empezar a eliminar tus Tweets de forma lenta.')
            console.log(TweetsXer.TweetCount + " Tweets on profile.")
            console.log("You can close the console now to reduce the memory usage.")
            console.log("Reopen the console if there are issues to see if an error shows up.")
        },

        async slowDelete(mode = 'all') {
            document.getElementById('start').remove()
            TweetsXer.total = TweetsXer.TweetCount
            TweetsXer.createProgressBar()

            const tabRegexMap = {
                posts: /(Posts|Tweets)$/i,
                replies: /(Replies|Respuestas|Tweets y respuestas)$/i,
                all: /(Posts|Tweets|Replies|Respuestas|Tweets y respuestas)$/i
            }
            const chosenRegex = tabRegexMap[mode] || tabRegexMap.all

            const tabLinks = Array.from(document.querySelectorAll('[data-testid="ScrollSnap-List"] a'))
                .filter(l => chosenRegex.test(l.textContent.trim()))

            const linksToProcess = tabLinks.length ? tabLinks : document.querySelectorAll('[data-testid="ScrollSnap-List"] a')

            for (const link of linksToProcess) {
                link.click()
                await TweetsXer.sleep(2000)
                await deleteCurrentTab()
            }

            console.log('Proceso terminado en modo', mode)

            async function deleteCurrentTab() {
                let unretweet, confirmURT, caret, menu, confirmation
                const more = '[data-testid="tweet"] [data-testid="caret"]'

                while (document.querySelectorAll(more).length > 0) {
                    await TweetsXer.sleep(1200)
                    document.querySelectorAll('section [data-testid="cellInnerDiv"]>div>div>div').forEach(x => x.remove())
                    document.querySelectorAll('section [data-testid="cellInnerDiv"]>div>div>[role="link"]').forEach(x => x.remove())
                    document.querySelector(more).scrollIntoView({ behavior: 'smooth' })

                    unretweet = document.querySelector('[data-testid="unretweet"]')
                    if (unretweet) {
                        unretweet.click()
                        confirmURT = await waitForElemToExist('[data-testid="unretweetConfirm"]')
                        confirmURT.click()
                    } else {
                        caret = await waitForElemToExist(more)
                        caret.click()
                        menu = await waitForElemToExist('[role="menuitem"]')
                        const deleteOption = [...document.querySelectorAll('[role="menuitem"]')]
                            .find(i => /delete|eliminar|borrar/i.test(i.textContent.toLowerCase()))
                        if (deleteOption) {
                            deleteOption.click()
                            confirmation = await waitForElemToExist('[data-testid="confirmationSheetConfirm"]')
                            if (confirmation) confirmation.click()
                        } else if (menu.textContent.includes('@')) {
                            caret.click()
                            document.querySelector('[data-testid="tweet"]').remove()
                        } else {
                            menu.click()
                            confirmation = await waitForElemToExist('[data-testid="confirmationSheetConfirm"]')
                            if (confirmation) confirmation.click()
                        }
                    }

                    TweetsXer.dCount++
                    TweetsXer.updateProgressBar()
                    if (TweetsXer.dCount % 100 == 0) console.log(`${new Date().toUTCString()} Deleted ${TweetsXer.dCount} Tweets`)
                }
            }
        },

        async unfollow() {
            //document.getElementById("toggleAdvanced").click()
            let unfollowCount = 0
            let next_unfollow, menu

            document.querySelector('[href$="/following"]').click()
            await TweetsXer.sleep(1200)

            const accounts = '[data-testid="UserCell"]'
            while (document.querySelectorAll('[data-testid="UserCell"] [data-testid$="-unfollow"]').length > 0) {
                next_unfollow = document.querySelectorAll(accounts)[0]
                next_unfollow.scrollIntoView({
                    'behavior': 'smooth'
                })

                next_unfollow.querySelector('[data-testid$="-unfollow"]').click()
                menu = await waitForElemToExist('[data-testid="confirmationSheetConfirm"]')
                menu.click()
                next_unfollow.remove()
                unfollowCount++
                if (unfollowCount % 10 == 0) console.log(`${new Date().toUTCString()} Unfollowed ${unfollowCount} accounts`)
                await TweetsXer.sleep(Math.floor(Math.random() * 200))
            }

            console.log('No accounts left. Please reload to confirm.')
        },
        removeTweetXer() {
            document.getElementById('exportUpload').remove()
        }
    }

    const waitForElemToExist = async (selector) => {

        const elem = document.querySelector(selector)
        if (elem) return elem

        return new Promise(resolve => {
            const observer = new MutationObserver(() => {
                const elem = document.querySelector(selector)
                if (elem) {
                    resolve(elem)
                    observer.disconnect()
                }
            })

            observer.observe(document.body, {
                subtree: true,
                childList: true,
            })
        })
    }

    TweetsXer.init()

    // START CODE BY Ali HaSsan TaHir
    // https://greasyfork.org/en/scripts/536593-generate-x-client-transaction-id/code
    const savedFrames = [];
    const ADDITIONAL_RANDOM_NUMBER = 3;
    const DEFAULT_KEYWORD = "obfiowerehiring";
    let defaultRowIndex = null;
    let defaultKeyBytesIndices = null;

    async function generateTID(api_path) {
        if (!defaultRowIndex || !defaultKeyBytesIndices) {
            const { firstIndex, remainingIndices } = await getIndices();
            defaultRowIndex = firstIndex;
            defaultKeyBytesIndices = remainingIndices;
        }

        const method = "GET"
        const path = api_path
        const key = await getKey();
        const keyBytes = getKeyBytes(key);
        const animationKey = getAnimationKey(keyBytes);
        const xTID = await getTransactionID(method, path, key, keyBytes, animationKey)
        //console.log("Generated Transaction ID: ", xTID)
        return (xTID)
    }

    const getFramesInterval = setInterval(() => {
        const nodes = document.querySelectorAll('[id^="loading-x-anim"]');

        if (nodes.length === 0 && savedFrames.length !== 0) {
            clearInterval(getFramesInterval);
            const serialized = savedFrames.map(node => node.outerHTML);
            localStorage.setItem("savedFrames", JSON.stringify(serialized));
            return;
        }

        nodes.forEach(removedNode => {
            if (!savedFrames.includes(removedNode)) {
                savedFrames.push(removedNode);
            }
        });
    }, 10);


    async function getIndices() {
        let url = null;
        const keyByteIndices = [];
        const targetFileMatch = document.documentElement.innerHTML.match(/"ondemand\.s":"([0-9a-f]+)"/);

        if (targetFileMatch) {
            const hexString = targetFileMatch[1];
            url = `https://abs.twimg.com/responsive-web/client-web/ondemand.s.${hexString}a.js`;
        } else {
            throw new Error("Transaction ID generator needs an update.");
        }

        const INDICES_REGEX = /\(\w{1}\[(\d{1,2})\],\s*16\)/g;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch indices file: ${response.statusText}`);
            }

            const jsContent = await response.text();
            const keyByteIndicesMatch = [...jsContent.matchAll(INDICES_REGEX)];

            keyByteIndicesMatch.forEach(item => {
                keyByteIndices.push(item[1]);
            });

            if (keyByteIndices.length === 0) {
                throw new Error("Couldn't get KEY_BYTE indices from file content");
            }

            const keyByteIndicesInt = keyByteIndices.map(Number);
            return {
                firstIndex: keyByteIndicesInt[0],
                remainingIndices: keyByteIndicesInt.slice(1),
            };
        } catch (error) {
            showError(error.message);
            return null;
        }
    }

    async function getKey() {
        return new Promise(resolve => {
            const meta = document.querySelector('meta[name="twitter-site-verification"]');
            if (meta) resolve(meta.getAttribute("content"));
        });
    }

    function getKeyBytes(key) {
        return Array.from(atob(key).split("").map(c => c.charCodeAt(0)));
    }

    function getFrames() {
        const stored = localStorage.getItem("savedFrames");
        if (stored) {
            const frames = JSON.parse(stored);
            const parser = new DOMParser();

            return frames.map(frame =>
                parser.parseFromString(frame, "text/html").body.firstChild
            );
        }
        return [];
    }

    function get2DArray(keyBytes) {
        const frames = getFrames();
        const array = Array.from(
            frames[keyBytes[5] % 4].children[0].children[1]
                .getAttribute("d")
                .slice(9)
                .split("C")
        ).map(item =>
            item
                .replace(/[^\d]+/g, " ")
                .trim()
                .split(" ")
                .map(Number)
        );
        return array;
    }

    function solve(value, minVal, maxVal, rounding) {
        const result = (value * (maxVal - minVal)) / 255 + minVal;
        return rounding ? Math.floor(result) : Math.round(result * 100) / 100;
    }

    function animate(frames, targetTime) {
        const fromColor = frames.slice(0, 3).concat(1).map(Number);
        const toColor = frames.slice(3, 6).concat(1).map(Number);
        const fromRotation = [0.0];
        const toRotation = [solve(frames[6], 60.0, 360.0, true)];
        const remainingFrames = frames.slice(7);
        const curves = remainingFrames.map((item, index) =>
            solve(item, isOdd(index), 1.0, false)
        );
        const cubic = new Cubic(curves);
        const val = cubic.getValue(targetTime);
        const color = interpolate(fromColor, toColor, val).map(value =>
            value > 0 ? value : 0
        );
        const rotation = interpolate(fromRotation, toRotation, val);
        const matrix = convertRotationToMatrix(rotation[0]);
        const strArr = color.slice(0, -1).map(value =>
            Math.round(value).toString(16)
        );

        for (const value of matrix) {
            let rounded = Math.round(value * 100) / 100;
            if (rounded < 0) {
                rounded = -rounded;
            }
            const hexValue = floatToHex(rounded);
            strArr.push(
                hexValue.startsWith(".")
                    ? `0${hexValue}`.toLowerCase()
                    : hexValue || "0"
            );
        }

        const animationKey = strArr.join("").replace(/[.-]/g, "");
        return animationKey;
    }

    function isOdd(num) {
        return num % 2 !== 0 ? -1.0 : 0.0;
    }

    function getAnimationKey(keyBytes) {
        const totalTime = 4096;

        if (typeof defaultRowIndex === "undefined" || typeof defaultKeyBytesIndices === "undefined") {
            throw new Error("Indices not initialized");
        }

        const rowIndex = keyBytes[defaultRowIndex] % 16;

        const frameTime = defaultKeyBytesIndices.reduce((acc, index) => {
            return acc * (keyBytes[index] % 16);
        }, 1);

        const arr = get2DArray(keyBytes);
        if (!arr || !arr[rowIndex]) {
            throw new Error("Invalid frame data");
        }

        const frameRow = arr[rowIndex];
        const targetTime = frameTime / totalTime;
        const animationKey = animate(frameRow, targetTime);

        return animationKey;
    }

    async function getTransactionID(method, path, key, keyBytes, animationKey) {
        if (!method || !path || !key || !animationKey) {
            return console.log("Invalid call.")
        }
        const timeNow = Math.floor((Date.now() - 1682924400 * 1000) / 1000);
        const timeNowBytes = [
            timeNow & 0xff,
            (timeNow >> 8) & 0xff,
            (timeNow >> 16) & 0xff,
            (timeNow >> 24) & 0xff,
        ];

        const inputString = `${method}!${path}!${timeNow}${DEFAULT_KEYWORD}${animationKey}`;
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inputString));
        const hashBytes = Array.from(new Uint8Array(hashBuffer));
        const randomNum = Math.floor(Math.random() * 256);
        const bytesArr = [
            ...keyBytes,
            ...timeNowBytes,
            ...hashBytes.slice(0, 16),
            ADDITIONAL_RANDOM_NUMBER,
        ];
        const out = new Uint8Array(bytesArr.length + 1);
        out[0] = randomNum;
        bytesArr.forEach((item, index) => {
            out[index + 1] = item ^ randomNum;
        });
        const transactionId = btoa(String.fromCharCode(...out)).replace(/=+$/, "");
        return transactionId;
    }

    class Cubic {
        constructor(curves) {
            this.curves = curves;
        }

        getValue(time) {
            let startGradient = 0;
            let endGradient = 0;
            let start = 0.0;
            let mid = 0.0;
            let end = 1.0;

            if (time <= 0.0) {
                if (this.curves[0] > 0.0) {
                    startGradient = this.curves[1] / this.curves[0];
                } else if (this.curves[1] === 0.0 && this.curves[2] > 0.0) {
                    startGradient = this.curves[3] / this.curves[2];
                }
                return startGradient * time;
            }

            if (time >= 1.0) {
                if (this.curves[2] < 1.0) {
                    endGradient = (this.curves[3] - 1.0) / (this.curves[2] - 1.0);
                } else if (this.curves[2] === 1.0 && this.curves[0] < 1.0) {
                    endGradient = (this.curves[1] - 1.0) / (this.curves[0] - 1.0);
                }
                return 1.0 + endGradient * (time - 1.0);
            }

            while (start < end) {
                mid = (start + end) / 2;
                const xEst = this.calculate(this.curves[0], this.curves[2], mid);
                if (Math.abs(time - xEst) < 0.00001) {
                    return this.calculate(this.curves[1], this.curves[3], mid);
                }
                if (xEst < time) {
                    start = mid;
                } else {
                    end = mid;
                }
            }
            return this.calculate(this.curves[1], this.curves[3], mid);
        }

        calculate(a, b, m) {
            return (
                3.0 * a * (1 - m) * (1 - m) * m +
                3.0 * b * (1 - m) * m * m +
                m * m * m
            );
        }
    }

    function interpolate(fromList, toList, f) {
        if (fromList.length !== toList.length) {
            throw new Error("Invalid list");
        }
        const out = [];
        for (let i = 0; i < fromList.length; i++) {
            out.push(interpolateNum(fromList[i], toList[i], f));
        }
        return out;
    }

    function interpolateNum(fromVal, toVal, f) {
        if (typeof fromVal === "number" && typeof toVal === "number") {
            return fromVal * (1 - f) + toVal * f;
        }
        if (typeof fromVal === "boolean" && typeof toVal === "boolean") {
            return f < 0.5 ? fromVal : toVal;
        }
    }

    function convertRotationToMatrix(degrees) {
        const radians = (degrees * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return [cos, sin, -sin, cos, 0, 0];
    }

    function floatToHex(x) {
        const result = [];
        let quotient = Math.floor(x);
        let fraction = x - quotient;

        while (quotient > 0) {
            quotient = Math.floor(x / 16);
            const remainder = Math.floor(x - quotient * 16);
            if (remainder > 9) {
                result.unshift(String.fromCharCode(remainder + 55));
            } else {
                result.unshift(remainder.toString());
            }
            x = quotient;
        }

        if (fraction === 0) {
            return result.join("");
        }

        result.push(".");

        while (fraction > 0) {
            fraction *= 16;
            const integer = Math.floor(fraction);
            fraction -= integer;
            if (integer > 9) {
                result.push(String.fromCharCode(integer + 55));
            } else {
                result.push(integer.toString());
            }
        }

        return result.join("");
    }

    function base64Encode(array) {
        return btoa(String.fromCharCode.apply(null, array));
    }

    // END CODE BY Ali HaSsan TaHir

    // Intercepta fetch para depuración: registra peticiones DeleteTweet
    ;(() => {
        const originalFetch = window.fetch
        window.fetch = async (...args) => {
            try {
                const url = typeof args[0] === 'string' ? args[0] : args[0].url || ''
                if (url.includes('DeleteTweet')) {
                    console.log('→ Fetch DeleteTweet', url, args[1]?.body || '')
                }
                const resp = await originalFetch(...args)
                if (url.includes('DeleteTweet')) {
                    console.log('← DeleteTweet respuesta', resp.status)
                }
                return resp
            } catch (e) {
                return originalFetch(...args)
            }
        }
    })()

})()
