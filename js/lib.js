const $ = selector => document.querySelector(selector) 

function titleize(n) {
  return n.replaceAll('_', ' ').replaceAll(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()))
}

function today() {
  return (new Date()).toISOString().slice(0,10)
}

const delay = t => new Promise(resolve => setTimeout(resolve, t))

async function request(query, data, options = {}) {
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNDQ0MjY4OSwiZXhwIjoxOTMwMDE4Njg5fQ.TBULgqU-TgI1gL0iScxM0k4B1xTBnQ_q0XLpdu7qnAs'
  const dbId = 'cqxvknmoofzuhxbonmoj'
  const method = query.includes('?') ? (data ? (data == 'DELETE' ? 'DELETE' : 'PATCH') : 'GET') : data ? 'POST' : 'GET'
  document.body.style.cursor = 'wait'
  const resp = await fetch(`https://${dbId}.supabase.co/rest/v1/${query}`, {
    method: method,
    cache: 'no-cache',
    headers: {
      apikey: anonKey,
      Authorization: options.isAnon ? anonKey : `Bearer ${localStorage.access_token || anonKey}`,
      'Content-Type': 'application/json',
      Prefer: options.isUpsert ? 'resolution=merge-duplicates' : 'return=representation'
    },
    body: data ? JSON.stringify(data) : undefined
  })

  const json = await resp.json()
  // console.log('request returns', resp, json)
  document.body.style.cursor = 'auto'
  if (!resp.ok) {
    // alert('Database request failed. (See console for details.)')
    if (confirm('Error! Could not reach the database. Try Again?')) {
      await delay(1500)
      return request(query, data, options)
    }
    alert(`Please take note of the following (or take a screenshot)
and report it to verifyitsupport@lwvalameda.org:

query: ${query}
data: ${JSON.stringify(data, null, 2)}
resp: ${JSON.stringify(json, null, 2)}`)
    return []
  }
  // console.log('query', query, 'returns', json)
  return json
}

// console.log('hello from lib.js')