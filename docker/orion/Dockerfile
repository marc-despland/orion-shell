FROM fiware/orion
COPY docker-entrypoint.sh /
RUN chmod u+rx /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh","-fg", "-multiservice", "-ngsiv1Autocast" ]