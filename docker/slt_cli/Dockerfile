FROM debian:bookworm-slim

ARG SLT_VERSION

RUN set -x \
    && test -n "$SLT_VERSION" \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && curl -fsSL "https://www.silabs.com/documents/public/software/slt-cli-${SLT_VERSION}-linux-x64.zip" -o /tmp/slt.zip \
    && mkdir -p /opt/silabs/slt \
    && unzip -q /tmp/slt.zip -d /opt/silabs/slt \
    && chmod +x /opt/silabs/slt/slt \
    && rm /tmp/slt.zip \
    && apt-get purge -y curl unzip \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && /opt/silabs/slt/slt --version \
    && : # last line

ENV PATH="/opt/silabs/slt:${PATH}"
CMD ["slt", "--version"]
