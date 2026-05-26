import InviteAcceptClient from './InviteAcceptClient'

type Props = {
  params: { token: string }
}

export default function InvitePage({ params }: Props) {
  return <InviteAcceptClient token={params.token} />
}
