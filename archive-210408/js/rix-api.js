function titleize(n) {
  return n.replaceAll('_', ' ').replaceAll(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()))
}

function today() {
  return (new Date()).toISOString().slice(0,10)
}

async function request(relName, query, data) {
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNDQ0MjY4OSwiZXhwIjoxOTMwMDE4Njg5fQ.TBULgqU-TgI1gL0iScxM0k4B1xTBnQ_q0XLpdu7qnAs'
  const dbId = 'cqxvknmoofzuhxbonmoj'
  const method = query ? (data ? (data == 'DELETE' ? 'DELETE' : 'PATCH') : 'GET') : 'POST'
  let queryString = ''
  if (query) {
    if (!query.select) query.select = ['*']
    if (!(query.select instanceof Array)) query.select = [query.select]
    if (query.order &&!(query.order instanceof Array)) query.order = [query.order]
    queryString = `?select=${query.select.join(',')}`
    if (query.order) queryString += `&order=${query.order.join(',')}`
    let filter = Object.keys(query)
      .filter( n => n != 'order' && n != 'select' )
      .map( key => encodeURIComponent(key) + '=' + encodeURIComponent(query[key]) )
    if (filter.length > 0) queryString += `&${filter.join('&')}`
  }
  console.log('queryString', queryString)  
  document.body.style.cursor = 'wait'
  const resp = await fetch(`https://${dbId}.supabase.co/rest/v1/${relName}${queryString}`, {
    method: method,
    cache: 'no-cache',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${localStorage.access_token || anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: data ? JSON.stringify(data) : undefined
  })

  const json = await resp.json()
  document.body.style.cursor = 'auto'
  if (!resp.ok) {
    if (resp.status && resp.status == 404) alert('Could not find record to update. You may not be authorized.')
    else if (resp.status && resp.status == 403) alert('You are not authorized.')
    else if (resp.status && resp.status == 401) {
      iziToast.show({
        title: 'Database', 
        message: 'Not authorized. Please request access.',
        position: 'topCenter',
        backgroundColor: 'yellow'
      })
      setTimeout( () => location.assign('./index.html'), 2000 )
    } 
    else alert(`ERROR: Request failed: ${json.message}`)
    console.warn('Request error:', resp, json)
    return []
  }
  console.log('query', query, 'returns', json)
  return json
}

async function populateForm() {
  async function runQuery() {
    let curQuery = {...query, ...key}
    console.log('about to request', curQuery)
    let rows = await request(rel, curQuery)
    console.log('rows', rows)
    if (rows.length == 1) return rows[0]
    if (rows.length == 0) alert('No rows returned. Probably a new record. Not yet implemented.')
    else alert('query returned more than 1 row. Only 1 is expected.')
    return []
  }
  const {rel, _, key, isNew} = getParams()
  if (isNew) {
    row = {}
    Object.keys(deflt).forEach( fn => {
      console.log('deflt', fn, deflt[fn], key[fn])
      row[fn] = key[fn] ? key[fn].split('.')[1] : (new Function('', `return ${deflt[fn]}`)).call(row)
    })
    document.querySelector('button[data-action=saveForm]').disabled = false
  }
  else if (row) console.warn('PopulateForm already has a row', row)
  else row = await runQuery()
  

  Array.from(document.forms[0].querySelectorAll('[id]')).forEach( node => {
    // console.log('  node', node.nodeName, node.id, row[node.id])
    if (!row.hasOwnProperty(node.id)) return
    node.value = row[node.id]
    if (
      node.nodeName == 'SELECT' && 
      node.closest('div[data-type]') && 
      node.closest('div[data-type]').dataset.type == 'fkey-fld'
    ) {
      // console.log('fkey?', node.id, row[node.id])
      node.innerHTML = `<option>${row[node.id]}</option>`
      let [rel, attr] = node.closest('div[data-parent]').dataset.parent.split('.')
      node.parentElement.querySelector('a[data-nav-parent]').href = `./${rel}-form.html#${attr}=${row[node.id]}`
      node.onfocus = async () => {
        if (node.classList.contains('populated')) return
        node.classList.add('populated')
        // console.log(node.id, row[node.id], rel, attr)
        let rows = await request(rel, {select: attr})
        node.innerHTML = rows.map( r => `<option>${r[attr]}</option>`)
      }
    }
  })
  if (window._postPopulate) _postPopulate()
  populateChildren()
}

function populateChildren() {
  // let relName = location.pathname.split(/-|\./).slice(-2,-1)[0]
  Object.keys(row).forEach( rn => {
    if (row[rn] instanceof Array) {
      let btnAdd = document.querySelector(`fieldset[data-child=${rn}] a[data-addrow]`)
      let [parentFn, _, childFn] = btnAdd.dataset['addrow'].split(/:|\./)
      let key = getParams().key[parentFn].split('.')[1] //remove the eq. prefix
      btnAdd.href += `&${childFn}=${key}`

      if (row[rn].length == 0) return
      // console.log('  child', rn, JSON.stringify(row[rn]))
      let childTmpl = document.querySelector(`fieldset[data-child=${rn}] li[data-row]`)
      let ref = childTmpl.closest('fieldset[data-ref]')
      var a
      row[rn].forEach( subrow => {
        if (ref) {
          let [_, fn, parentRel, parentFn] = ref.dataset.ref.match(/(\w+):(\w+)\.(\w+)/)
          // console.log('    ref', fn, parentRel, parentFn)
          let target = `${parentFn}=${subrow[fn]}`
          // console.log('    subrow', subrow, target)
          a = `<a href="./${parentRel}-form.html#${target}">${subrow[fn]}</a>`
          // console.log('    a', a)
        }
        else {
          let target = Object.keys(subrow).map( k => `${k}=${subrow[k]}`).join('&')
          // console.log('    subrow', subrow, target)
          a = `<a href="./${rn}-form.html#${target}">${Object.values(subrow).join('; ')}</a>`
          // console.log('    a', a)
        }
        let newItem = childTmpl.cloneNode(true)
        newItem.innerHTML = a
        childTmpl.parentElement.appendChild(newItem)
      })
      childTmpl.remove()
    }
  })
}

// function getParams() {
//   let [_,rel, mode] = location.pathname.match(/.+\/(\w+)-(\w+)\.html/)  
//   let isNew = location.search == '?new'
//   let key = {}
//   new URLSearchParams(location.hash.slice(1)).forEach( (v, k) => key[k] = `eq.${v}`)
//   // console.log('rel', rel, 'mode', mode, 'key', key)
//   return {rel, mode, key, isNew}
// }
function getParams() {
  // let [_,rel, mode] = location.pathname.match(/.+\/(\w+)-(\w+)\.html/)  
  let [_,rel, mode] = location.pathname.match(/.*\/(\w+)-(\w+)/)  
  let key = {}
  new URLSearchParams(location.hash.slice(1)).forEach( (v, k) => key[k] = `eq.${v}`)
  // console.log('rel', rel, 'mode', mode, 'key', key)
  let isNew = key.hasOwnProperty('_new')
  delete key._new
  return {rel, mode, key, isNew}
}

async function populateList() {
  async function runQuery() {
    let curQuery = {...query, ...key, ...filter}
    let rows = await request(rel, curQuery)
    let dataRow = document.querySelector('tr[data-row]')
    let parent = dataRow.parentElement
    parent.removeChild(dataRow)
    parent.innerHTML = ''
    // console.log('populateList', rows.length, relName, dataRow)
    rows.forEach( r => {
      newRow = dataRow.cloneNode(true)
      newRow.querySelectorAll('td[data-name]').forEach( td => {
        td.textContent = r[td.dataset.name]
        td.dataset.label = titleize(td.dataset.name)
      })
      parent.appendChild(newRow)
    })
    document.querySelector('span[data-rowcount').textContent = `${rows.length} rows`
  }

  document.querySelectorAll('td.search-col input').forEach( node => node.oninput = evt => {
    evt.preventDefault()
    // console.log('updateSearch', evt.target.name, evt.target.value)
    filter[evt.target.name] = `ilike.*${evt.target.value}*`
    runQuery()
  })

  document.querySelector('table.data-result tbody').onclick = evt => {
    evt.preventDefault()
    // console.log('row clicked', evt.target)
    let key = Array.from(evt.target.parentElement.children)
      .filter( n => n.dataset.key )
      .map( n => encodeURIComponent(n.dataset.name) + '=' + encodeURIComponent(n.textContent) )

    // console.log('key', rel, key)
    location.assign(`./${rel}-form.html?#${key.join('&')}`)
  }

  document.querySelector('table.data-result tbody').oncontextmenu = async evt => {
    evt.preventDefault()
    console.log('context menu clicked', evt.target)
    let key = {}
    Array.from(evt.target.parentElement.children)
      .filter( n => n.dataset.key )
      .forEach( n => key[n.dataset.name] = n.textContent )

    if (confirm(`Are you sure you want to remove "${Object.values(key).join('; ')}?`) && confirm('REALLY?')) {
    Object.keys(key).forEach(n => key[n] = `eq.${key[n]}`)
    console.log('delete', rel, key)
    let result = await request(rel, key, 'DELETE')
    console.log('delete result', result)
    if (result.length > 0) {
      iziToast.show({
        title: 'Delete', 
        message: 'Successfully removed the record.',
        position: 'topCenter',
        backgroundColor: 'lightgreen'
      })
      populateList()
    }
    else iziToast.show({
      title: 'Delete', 
      message: 'Failed to remove the record.',
      position: 'topCenter',
      backgroundColor: 'red'
    })
   }
    // location.assign(`./${rel}-form.html?#${key.join('&')}`)
  }


  const {rel, _, key} = getParams()
  let filter = {}
  runQuery()
}

function handleFormChange(evt) {
  // console.log('handleFormChange', evt instanceof Event, evt)
  if (evt instanceof Event) evt.preventDefault()
  let btn = document.querySelector('button[data-action=saveForm]')
  btn.disabled = false
}

async function saveForm(evt) {
  evt.preventDefault()
  let {rel, _, __, isNew} = getParams()

  let statement = {}
  let data = {}

  if (window._preSave) _preSave()

  let elems = Array.from(document.forms[0].elements)
  elems.forEach( n => {
    if (!n.name || typeof n.value != 'string' ) return // non-fields
    if (!n.dataset.key && n.value == (row[n.name]?.toString() || '')) return // compare strings only
    
    data[n.name] = n.value
    statement[n.name] = `eq.${row[n.name]}`
  })
  if (isNew) statement = null
  console.log('saveForm', rel, statement, data)
  let rows = await request(rel, statement, data)
  console.log('after save', rows)
  if (!rows || rows.length == 0) return
  row = rows[0] // global row
  const newKey = Object.keys(row)
    .filter( fn => location.hash.includes(fn + '=') )
    .map( fn => `${fn}=${row[fn]}` )
  // console.log('newKey', newKey)
  delete newKey._new
  location.hash = newKey.join('&')

  iziToast.show({
    title: 'Save', 
    message: 'Successfully saved your changes.',
    position: 'topCenter',
    backgroundColor: 'lightgreen'
  })
  document.querySelector('button[data-action=saveForm]').disabled = true
  populateForm()
}

var row
async function main() {

  let mode = getParams().mode
  if (mode == 'list') populateList()
  else if (mode == 'form') populateForm()

  // CKEDITOR.disableAutoInline = true;
  
  if (document.forms.length > 0) {
    document.forms[0].onchange = handleFormChange
    document.forms[0].onsubmit = saveForm
    window.onbeforeunload = () => document.querySelector('button[data-action=saveForm]').disabled ? null : ''
  }

  if (document.querySelector('[data-user-name') && localStorage.name)
    document.querySelector('[data-user-name').textContent = localStorage.name

}


main()
