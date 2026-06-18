/** 마을/성장 허브 내부 테스트 계정 (migration_088) */
export const VILLAGE_TEST_PHONE_DIGITS = '01067780001'
export const VILLAGE_TEST_MEMBER_NAME = '마을테스트6778'

export function isVillageTestMember(member: {
  phone: string
  name: string
}): boolean {
  const digits = member.phone.replace(/\D/g, '')
  return (
    digits === VILLAGE_TEST_PHONE_DIGITS ||
    member.name === VILLAGE_TEST_MEMBER_NAME
  )
}
