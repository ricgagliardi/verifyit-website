async function cleanedGeoLocation() {
  const resp = await fetch('https://ipapi.co/region_code')
  const usState = await resp.text()
  console.log('here', usState)
  return (['AZ','CA','FL','GA', 'MI','OH','PA','TX', 'WI'].includes(usState)) ? usState : 'Any'
}


$('#teachers').onclick = async e => {
  const data = await request('question?select=question_content&title=eq.Teachers Description')
  $('#modal-heading').textContent = 'TEACHERS:'
  $('#modal-content').innerHTML = data[0].question_content
  $('#modal-control').click()
}

$('#about').onclick = async e => {
  const data = await request('question?select=question_content&title=eq.About Description')
  $('#modal-heading').textContent = 'ABOUT US:'
  $('#modal-content').innerHTML = data[0].question_content
  $('#modal-control').click()
}

async function main() {
  const playerState = await cleanedGeoLocation()
  console.log('player state', playerState)
  const data = await request(`game?name=ilike.${playerState}*mixed*&select=name`)

  const gameName = data.length > 0 ? data[0].name : 'News'
  console.log('game', gameName)
  $('#btn-single-player').href += `#game=${gameName}`
  $('#btn-single-player').hidden = false
}

main()