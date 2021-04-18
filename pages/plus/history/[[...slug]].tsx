import { Box } from "@chakra-ui/layout";
import { Select } from "@chakra-ui/select";
import { Trans } from "@lingui/macro";
import { PlusRegion } from "@prisma/client";
import MyHead from "components/common/MyHead";
import MyLink from "components/common/MyLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/common/Table";
import UserAvatar from "components/common/UserAvatar";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { Fragment } from "react";
import { FiCheck } from "react-icons/fi";
import plusService, {
  DistinctSummaryMonths,
  VotingSummariesByMonthAndTier,
} from "services/plus";
import { getFullUsername, getLocalizedMonthYearString } from "utils/strings";

export interface PlusVotingHistoryPageProps {
  summaries: VotingSummariesByMonthAndTier;
  monthsWithData: DistinctSummaryMonths;
}

const PlusVotingHistoryPage = ({
  summaries,
  monthsWithData,
}: PlusVotingHistoryPageProps) => {
  const router = useRouter();
  return (
    <>
      <MyHead title="Voting History" />
      <Select
        onChange={(e) => {
          router.replace(`/plus/history/${e.target.value}`);
        }}
        maxW={64}
        mb={8}
        data-cy="tier-selector"
      >
        {monthsWithData.map(({ month, year, tier }) => (
          <option
            key={`${month}${year}${tier}`}
            value={`${tier}/${year}/${month}`}
          >
            +{tier} - {getLocalizedMonthYearString(month, year, "en")}
          </option>
        ))}
      </Select>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader />
            <TableHeader>
              <Trans>Name</Trans>
            </TableHeader>
            <TableHeader>
              <Trans>Percentage</Trans>
            </TableHeader>
            <TableHeader>
              <Trans>Count (NA)</Trans>
            </TableHeader>
            <TableHeader>
              <Trans>Count (EU)</Trans>
            </TableHeader>
            <TableHeader>
              <Trans>Region</Trans>
            </TableHeader>
            <TableHeader>
              <Trans>Suggested</Trans>
            </TableHeader>
            <TableHeader>
              <Trans>Vouched</Trans>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaries.map((summary) => {
            const getCount = (region: PlusRegion, counts: number[]) => {
              if (region === summary.regionForVoting) return counts;

              return counts.slice(1, 3);
            };
            return (
              <TableRow key={summary.user.id}>
                <TableCell>
                  <MyLink href={`/u/${summary.user.discordId}`}>
                    <UserAvatar user={summary.user} />
                  </MyLink>
                </TableCell>
                <TableCell>
                  <MyLink
                    href={`/u/${summary.user.discordId}`}
                    isColored={false}
                  >
                    {getFullUsername(summary.user)}
                  </MyLink>
                </TableCell>
                <TableCell
                  color={summary.percentage >= 50 ? "green.500" : "red.500"}
                >
                  {summary.percentage}%
                </TableCell>
                <TableCell>
                  {getCount("NA", summary.countsNA).map((count, i, arr) => (
                    <Fragment key={i}>
                      <Box
                        as="span"
                        color={
                          i + 1 <= arr.length / 2 ? "red.500" : "green.500"
                        }
                      >
                        {count}
                      </Box>
                      {i !== arr.length - 1 && <>/</>}
                    </Fragment>
                  ))}
                </TableCell>
                <TableCell>
                  {getCount("EU", summary.countsEU).map((count, i, arr) => (
                    <Fragment key={i}>
                      <Box
                        as="span"
                        color={
                          i + 1 <= arr.length / 2 ? "red.500" : "green.500"
                        }
                      >
                        {count}
                      </Box>
                      {i !== arr.length - 1 && <>/</>}
                    </Fragment>
                  ))}
                </TableCell>
                <TableCell>{summary.regionForVoting}</TableCell>
                <TableCell>
                  {summary.wasSuggested && (
                    <Box mx="auto" fontSize="xl" as={FiCheck} />
                  )}
                </TableCell>
                <TableCell>
                  {summary.wasVouched && (
                    <Box mx="auto" fontSize="xl" as={FiCheck} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<PlusVotingHistoryPageProps> = async ({
  params,
}) => {
  const getSlug = async () => {
    const slug = Array.isArray(params!.slug) ? params!.slug : [];
    if (slug.length === 3) {
      return slug;
    }

    if (slug.length > 0) {
      return [];
    }

    const mostRecent = await plusService.getMostRecentVotingWithResultsMonth();

    return ["1", mostRecent.year, mostRecent.month];
  };

  const [tier, year, month] = (await getSlug()).map((param) => Number(param));
  if (!tier) return { notFound: true };

  const [summaries, monthsWithData] = await Promise.all([
    plusService.getVotingSummariesByMonthAndTier({
      tier: tier as any,
      year,
      month,
    }),
    plusService.getDistinctSummaryMonths(),
  ]);

  if (!summaries.length) return { notFound: true };

  return {
    props: { summaries, monthsWithData },
  };
};

export default PlusVotingHistoryPage;
